import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../core/services/chat';
import { SocketService } from '../../../core/services/socket';
import { User } from '../../../core/models/models';

@Component({
  selector: 'app-friend-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './friend-requests.html',
})
export class FriendRequestsComponent {
  @Output() backClicked = new EventEmitter<void>();

  chatService = inject(ChatService);
  socket = inject(SocketService);

  get requests() {
    return this.chatService.friendRequests();
  }

  accept(user: User) {
    this.chatService.acceptFriendRequest(user._id).subscribe({
      next: () => {
        this.socket.acceptFriendRequest(user._id);
        this.chatService.friendRequests.update((r) => r.filter((u) => u._id !== user._id));
        this.chatService.friends.update((f) => [...f, user]);
      },
      error: (err) => console.error(err),
    });
  }

  reject(user: User) {
    this.chatService.rejectFriendRequest(user._id).subscribe({
      next: () => {
        this.chatService.friendRequests.update((r) => r.filter((u) => u._id !== user._id));
      },
      error: (err) => console.error(err),
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
