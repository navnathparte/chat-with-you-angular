import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { ChatService } from '../../../core/services/chat';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
})
export class ProfileComponent {
  @Output() backClicked = new EventEmitter<void>();

  auth = inject(AuthService);
  chatService = inject(ChatService);

  uploading = signal(false);
  uploadError = signal('');
  uploadSuccess = signal('');

  get user() {
    return this.auth.currentUser();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.uploadError.set('');
    this.uploadSuccess.set('');

    this.chatService.uploadAvatar(file).subscribe({
      next: (res) => {
        // Update currentUser signal with new avatar
        this.auth.currentUser.update((u) => (u ? { ...u, avatar: res.avatar } : u));
        this.uploadSuccess.set('Profile picture updated!');
        this.uploading.set(false);
        setTimeout(() => this.uploadSuccess.set(''), 3000);
      },
      error: (err) => {
        this.uploadError.set(err.error?.message || 'Upload failed');
        this.uploading.set(false);
      },
    });

    // Reset input
    input.value = '';
  }
}
