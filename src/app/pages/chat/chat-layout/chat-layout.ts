import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { ChatService } from '../../../core/services/chat';
import { SocketService } from '../../../core/services/socket';
import { Chat, User } from '../../../core/models/models';
import { SidebarComponent } from '../sidebar/sidebar';
import { ChatWindowComponent } from '../chat-window/chat-window';
import { AddFriendComponent } from '../add-friend/add-friend';
import { FriendRequestsComponent } from '../friend-requests/friend-requests';
import { ProfileComponent } from '../profile/profile';

export type ActivePanel = 'chat' | 'add-friend' | 'friend-requests' | 'profile';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    ChatWindowComponent,
    AddFriendComponent,
    FriendRequestsComponent,
    ProfileComponent,
  ],
  templateUrl: './chat-layout.html',
})
export class ChatLayoutComponent implements OnInit {
  auth = inject(AuthService);
  chatService = inject(ChatService);
  socket = inject(SocketService);

  activePanel = signal<ActivePanel>('chat');
  mobileShowChat = signal(false); // On mobile: show sidebar (false) or chat (true)

  ngOnInit() {
    // If user refreshes, reconnect socket and reload data
    if (!this.socket.isConnected()) {
      this.socket.connect();
    }
    this.chatService.loadChats().subscribe();
    this.chatService.loadFriends().subscribe();
    this.chatService.loadFriendRequests().subscribe();
  }

  selectChat(chat: Chat) {
    this.chatService.setActiveChat(chat);
    this.socket.joinChat(chat._id);
    this.activePanel.set('chat');
    this.mobileShowChat.set(true);
  }

  openChatWithFriend(friend: User) {
    this.chatService.getOrCreateChat(friend._id).subscribe({
      next: (chat) => {
        this.socket.joinChat(chat._id);
        this.activePanel.set('chat');
        this.mobileShowChat.set(true);
      },
      error: (err) => console.error('Failed to open chat:', err),
    });
  }

  goBackToSidebar() {
    this.mobileShowChat.set(false);
  }

  setPanel(panel: ActivePanel) {
    this.activePanel.set(panel);
    this.chatService.setActiveChat(null);
    this.mobileShowChat.set(panel === 'chat' ? false : true);
  }

  logout() {
    this.socket.disconnect();
    this.auth.logout();
  }
}
