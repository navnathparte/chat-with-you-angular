import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { SocketService } from '../../../core/services/socket';
import { ChatService } from '../../../core/services/chat';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);

  login() {
    if (!this.email.trim() || !this.password) {
      this.error.set('Please enter your email and password');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.socket.connect();
        this.chatService.loadChats().subscribe();
        this.chatService.loadFriends().subscribe();
        this.chatService.loadFriendRequests().subscribe();
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Login failed. Please try again.');
        this.loading.set(false);
      },
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.login();
  }
}
