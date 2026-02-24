import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { ChatService } from '../../../core/services/chat';
import { Chat, User } from '../../../core/models/models';
import { ActivePanel } from '../chat-layout/chat-layout';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  auth = inject(AuthService);
  chatService = inject(ChatService);

  @Output() chatSelected = new EventEmitter<Chat>();
  @Output() friendSelected = new EventEmitter<User>();
  @Output() panelChange = new EventEmitter<ActivePanel>();
  @Output() logout = new EventEmitter<void>();

  searchQuery = '';
  activeTab: 'chats' | 'friends' = 'chats';

  get myId() {
    return this.auth.getUserId();
  }

  get filteredChats() {
    const q = this.searchQuery.toLowerCase();
    const chats = this.chatService.chats();
    if (!q) return chats;
    return chats.filter((c) => {
      const other = this.chatService.getOtherParticipant(c, this.myId!);
      return other?.username.toLowerCase().includes(q) || other?.email.toLowerCase().includes(q);
    });
  }

  get filteredFriends() {
    const q = this.searchQuery.toLowerCase();
    const friends = this.chatService.friends();
    if (!q) return friends;
    return friends.filter(
      (f) => f.username.toLowerCase().includes(q) || f.email.toLowerCase().includes(q),
    );
  }

  getOtherUser(chat: Chat) {
    return this.chatService.getOtherParticipant(chat, this.myId!);
  }

  getLastMessagePreview(chat: Chat): string {
    const msg = chat.lastMessage;
    if (!msg) return 'No messages yet';
    const isMine = msg.sender?._id === this.myId;
    const prefix = isMine ? 'You: ' : '';
    const content = msg.content.length > 30 ? msg.content.slice(0, 30) + '…' : msg.content;
    return prefix + content;
  }

  getTime(chat: Chat): string {
    const date = chat.lastMessage?.createdAt
      ? new Date(chat.lastMessage.createdAt)
      : new Date(chat.updatedAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  selectChat(chat: Chat) {
    this.chatSelected.emit(chat);
  }

  selectFriend(friend: User) {
    this.friendSelected.emit(friend);
  }

  isActive(chat: Chat): boolean {
    return this.chatService.activeChat()?._id === chat._id;
  }

  get friendRequestCount() {
    return this.chatService.friendRequests().length;
  }
}
