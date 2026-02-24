import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { tap } from 'rxjs';
import { User } from '../models/models';

interface JwtPayload {
  id: string;
  username: string;
  email: string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'http://localhost:3000/api/auth';
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isLoggedIn = signal(false);

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    const token = this.getToken();
    if (!token) return;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      // Check token not expired
      if (decoded.exp * 1000 < Date.now()) {
        this.clearSession();
        return;
      }
      this.currentUser.set({
        _id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        isOnline: true,
      });
      this.isLoggedIn.set(true);
    } catch {
      this.clearSession();
    }
  }

  register(username: string, email: string, password: string) {
    return this.http.post<{ message: string }>(`${this.API}/register`, {
      username,
      email,
      password,
    });
  }

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: User }>(`${this.API}/login`, {
        email,
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem('token', res.token);
          this.currentUser.set(res.user);
          this.isLoggedIn.set(true);
        }),
      );
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession() {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): string | null {
    return this.currentUser()?._id ?? null;
  }
}
