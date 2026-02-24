import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { SocketService } from '../../../core/services/socket';
import { ChatService } from '../../../core/services/chat';
import { Chat, Message } from '../../../core/models/models';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.html',
})
export class ChatWindowComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() chat!: Chat;
  @Output() backClicked = new EventEmitter<void>();

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  auth = inject(AuthService);
  socket = inject(SocketService);
  chatService = inject(ChatService);

  messageText = '';
  private typingTimeout?: ReturnType<typeof setTimeout>;
  private shouldScroll = false;
  private prevMessageCount = 0;

  get myId() {
    return this.auth.getUserId()!;
  }

  // ✅ FIX 1: Read from reactive activeChat() signal so lastSeen/isOnline updates live
  otherUser = computed(() => {
    const active = this.chatService.activeChat();
    if (!active) return null;
    return this.chatService.getOtherParticipant(active, this.myId);
  });

  // ✅ FIX 2: computed() so zoneless Angular re-renders when typingUsers signal changes
  isTyping = computed(() => this.socket.typingUsers().size > 0);

  get messages() {
    return this.socket.messages();
  }

  ngOnChanges() {
    this.shouldScroll = true;
  }

  ngAfterViewChecked() {
    const msgs = this.socket.messages();
    if (this.shouldScroll || msgs.length !== this.prevMessageCount) {
      this.scrollToBottom();
      this.prevMessageCount = msgs.length;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  private scrollToBottom() {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  send() {
    const content = this.messageText.trim();
    if (!content || !this.chat) return;

    this.socket.sendMessage(this.chat._id, content);
    this.messageText = '';
    this.socket.sendTyping(this.chat._id, false);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.shouldScroll = true;
    this.messageInput?.nativeElement?.focus();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onInput() {
    this.socket.sendTyping(this.chat._id, true);
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socket.sendTyping(this.chat._id, false);
    }, 2000);
  }

  isMine(msg: Message): boolean {
    return msg.sender._id === this.myId;
  }

  getTime(msg: Message): string {
    return new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000 && now.getDate() === date.getDate()) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  }

  shouldShowDateSeparator(msgs: Message[], index: number): boolean {
    if (index === 0) return true;
    const prev = new Date(msgs[index - 1].createdAt).toDateString();
    const curr = new Date(msgs[index].createdAt).toDateString();
    return prev !== curr;
  }

  // ✅ FIX 3: Now reads from otherUser() computed signal — always fresh
  getLastSeenText(): string {
    const user = this.otherUser();
    if (!user) return '';
    if (user.isOnline) return 'online';
    if (!user.lastSeen) return 'last seen recently';
    const date = new Date(user.lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000 && now.getDate() === date.getDate()) {
      return `last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diff < 172800000) {
      return `last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
