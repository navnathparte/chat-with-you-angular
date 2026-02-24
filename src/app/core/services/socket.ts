import { Injectable, signal, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth';
import { ChatService } from './chat';
import { Message } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket!: Socket;
  private auth = inject(AuthService);
  private chatService = inject(ChatService);

  isConnected = signal(false);
  messages = signal<Message[]>([]);
  typingUsers = signal<Set<string>>(new Set());
  currentChatId = signal<string | null>(null);

  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  connect() {
    const token = this.auth.getToken();
    if (!token || this.socket?.connected) return;

    this.socket = io('https://chat-with-you-node.onrender.com', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      this.isConnected.set(true);
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
      console.log('🔌 Socket disconnected');
    });

    // ── Message events ────────────────────────────────────────────────────
    this.socket.on('previous_messages', (msgs: Message[]) => {
      this.messages.set(msgs);
    });

    this.socket.on('receive_message', (msg: Message) => {
      // Only add to view if we're in this chat
      if (msg.chat === this.currentChatId()) {
        this.messages.update((m) => [...m, msg]);
      } else {
        // Increment unread badge for other chats
        this.chatService.incrementUnread(msg.chat);
      }
      this.chatService.updateChatLastMessage(msg.chat, msg);
    });

    this.socket.on(
      'new_message_notification',
      ({ chatId, message }: { chatId: string; message: Message }) => {
        if (chatId !== this.currentChatId()) {
          this.chatService.incrementUnread(chatId);
        }
        this.chatService.updateChatLastMessage(chatId, message);
      },
    );

    // ── Read receipts ─────────────────────────────────────────────────────
    this.socket.on(
      'messages_delivered',
      ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
        if (chatId === this.currentChatId()) {
          this.messages.update((msgs) =>
            msgs.map((m) =>
              messageIds.includes(m._id) && m.status === 'sent'
                ? { ...m, status: 'delivered' as const }
                : m,
            ),
          );
        }
      },
    );

    this.socket.on('messages_read', ({ chatId, readBy }: { chatId: string; readBy: string }) => {
      if (chatId === this.currentChatId()) {
        this.messages.update((msgs) =>
          msgs.map((m) =>
            !m.readBy.includes(readBy)
              ? { ...m, status: 'read' as const, readBy: [...m.readBy, readBy] }
              : m,
          ),
        );
      }
    });

    // ── Typing ────────────────────────────────────────────────────────────
    this.socket.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      // Clear existing timer for this user
      if (this.typingTimers.has(userId)) {
        clearTimeout(this.typingTimers.get(userId)!);
        this.typingTimers.delete(userId);
      }

      this.typingUsers.update((s) => {
        const next = new Set(s);
        if (isTyping) {
          next.add(userId);
          // Auto-remove after 3 seconds (in case stop event is missed)
          const timer = setTimeout(() => {
            this.typingUsers.update((ts) => {
              const ns = new Set(ts);
              ns.delete(userId);
              return ns;
            });
          }, 3000);
          this.typingTimers.set(userId, timer);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // ── Friend status ─────────────────────────────────────────────────────
    this.socket.on(
      'friend_status',
      ({
        userId,
        isOnline,
        lastSeen,
      }: {
        userId: string;
        isOnline: boolean;
        lastSeen?: string;
      }) => {
        this.chatService.updateFriendStatus(userId, isOnline, lastSeen);
      },
    );

    // ── Friend requests ───────────────────────────────────────────────────
    this.socket.on('friend_request_received', ({ from }: any) => {
      this.chatService.friendRequests.update((r) => [from, ...r]);
    });

    this.socket.on('friend_request_accepted', ({ by }: any) => {
      this.chatService.friends.update((f) => [...f, by]);
    });

    this.socket.on('friend_request_accepted_self', ({ userId }: any) => {
      // Remove from pending requests
      this.chatService.friendRequests.update((r) => r.filter((u) => u._id !== userId));
    });
  }

  // ── Emitters ────────────────────────────────────────────────────────────────

  joinChat(chatId: string) {
    if (this.currentChatId()) {
      this.socket.emit('leave_chat', this.currentChatId());
    }
    this.currentChatId.set(chatId);
    this.messages.set([]); // Clear before loading
    this.typingUsers.set(new Set());
    this.socket.emit('join_chat', chatId);
    this.chatService.clearUnread(chatId);
  }

  sendMessage(chatId: string, content: string) {
    this.socket.emit('send_message', { chatId, content });
  }

  sendTyping(chatId: string, isTyping: boolean) {
    this.socket.emit('typing', { chatId, isTyping });
  }

  sendFriendRequest(targetUserId: string) {
    this.socket.emit('send_friend_request', { targetUserId });
  }

  acceptFriendRequest(fromUserId: string) {
    this.socket.emit('accept_friend_request', { fromUserId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.isConnected.set(false);
  }
}
