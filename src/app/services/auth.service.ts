import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService { // ⚡ nombre exacto y exportado
  private baseUrl = 'http://localhost:8081/auth'; // Puerto del backend

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    return this.http.post<{ token: string, username: string }>(
      `${this.baseUrl}/login`,
      { username, password }
    );
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }
}
