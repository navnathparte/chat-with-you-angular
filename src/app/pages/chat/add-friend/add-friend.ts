import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat';
import { SocketService } from '../../../core/services/socket';
import { User } from '../../../core/models/models';

@Component({
  selector: 'app-add-friend',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-friend.html',
})
export class AddFriendComponent {
  @Output() backClicked = new EventEmitter<void>();

  private chatService = inject(ChatService);
  private socket = inject(SocketService);

  searchEmail = '';
  searchResult = signal<User | null>(null);
  searchError = signal('');
  searching = signal(false);
  requestSent = signal(false);

  search() {
    const email = this.searchEmail.trim();
    if (!email) return;

    this.searching.set(true);
    this.searchResult.set(null);
    this.searchError.set('');
    this.requestSent.set(false);

    this.chatService.searchUser(email).subscribe({
      next: (user) => {
        this.searchResult.set(user);
        this.searching.set(false);
      },
      error: (err) => {
        this.searchError.set(err.error?.message || 'User not found');
        this.searching.set(false);
      },
    });
  }

  sendRequest() {
    const user = this.searchResult();
    if (!user) return;

    // Use both REST (to persist) and Socket (for real-time notification)
    this.chatService.sendFriendRequest(user._id).subscribe({
      next: () => {
        this.socket.sendFriendRequest(user._id);
        this.requestSent.set(true);
        this.searchResult.update((u) => (u ? { ...u, requestSent: true } : u));
      },
      error: (err) => {
        this.searchError.set(err.error?.message || 'Failed to send request');
      },
    });
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
