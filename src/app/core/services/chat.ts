import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Chat, Message, User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly API = 'http://localhost:3000/api';
  private http = inject(HttpClient);

  // ── Signals ──────────────────────────────────────────────────────────────
  chats = signal<Chat[]>([]);
  activeChat = signal<Chat | null>(null);
  friends = signal<User[]>([]);
  friendRequests = signal<User[]>([]);

  // ── Chat API ─────────────────────────────────────────────────────────────

  loadChats() {
    return this.http.get<Chat[]>(`${this.API}/chats`).pipe(tap((chats) => this.chats.set(chats)));
  }

  getOrCreateChat(userId: string) {
    return this.http.post<Chat>(`${this.API}/chats`, { userId }).pipe(
      tap((chat) => {
        this.chats.update((list) => {
          const idx = list.findIndex((c) => c._id === chat._id);
          if (idx >= 0) {
            const updated = [...list];
            updated[idx] = chat;
            return updated;
          }
          return [chat, ...list];
        });
        this.activeChat.set(chat);
      }),
    );
  }

  getMessages(chatId: string) {
    return this.http.get<Message[]>(`${this.API}/chats/${chatId}/messages`);
  }

  setActiveChat(chat: Chat | null) {
    this.activeChat.set(chat);
  }

  // ── Friends API ───────────────────────────────────────────────────────────

  loadFriends() {
    return this.http.get<User[]>(`${this.API}/users/friends`).pipe(tap((f) => this.friends.set(f)));
  }

  loadFriendRequests() {
    return this.http
      .get<User[]>(`${this.API}/users/friend-requests`)
      .pipe(tap((r) => this.friendRequests.set(r)));
  }

  searchUser(email: string) {
    return this.http.get<User>(`${this.API}/users/search`, {
      params: { email },
    });
  }

  sendFriendRequest(targetId: string) {
    return this.http.post(`${this.API}/users/friend-request/${targetId}`, {});
  }

  acceptFriendRequest(fromId: string) {
    return this.http.post(`${this.API}/users/friend-request/${fromId}/accept`, {});
  }

  rejectFriendRequest(fromId: string) {
    return this.http.delete(`${this.API}/users/friend-request/${fromId}`);
  }

  uploadAvatar(file: File) {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post<{ avatar: string }>(`${this.API}/users/avatar`, form);
  }

  // ── State Helpers ─────────────────────────────────────────────────────────

  getOtherParticipant(chat: Chat, myId: string): User | null {
    return chat.participants.find((p) => p._id !== myId) ?? null;
  }

  updateChatLastMessage(chatId: string, message: Message) {
    this.chats.update((list) =>
      list
        .map((c) =>
          c._id === chatId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c,
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    );
  }

  incrementUnread(chatId: string) {
    this.chats.update((list) =>
      list.map((c) => (c._id === chatId ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 } : c)),
    );
  }

  clearUnread(chatId: string) {
    this.chats.update((list) => list.map((c) => (c._id === chatId ? { ...c, unreadCount: 0 } : c)));
  }

  updateFriendStatus(userId: string, isOnline: boolean, lastSeen?: string) {
    const patch = { isOnline, ...(lastSeen ? { lastSeen } : {}) };

    this.friends.update((list) => list.map((f) => (f._id === userId ? { ...f, ...patch } : f)));

    this.chats.update((list) =>
      list.map((c) => ({
        ...c,
        participants: c.participants.map((p) => (p._id === userId ? { ...p, ...patch } : p)),
      })),
    );

    // Update active chat too
    const active = this.activeChat();
    if (active) {
      this.activeChat.set({
        ...active,
        participants: active.participants.map((p) => (p._id === userId ? { ...p, ...patch } : p)),
      });
    }
  }
}
