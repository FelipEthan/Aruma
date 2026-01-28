import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // ⚡ Import necesario para *ngIf y ngClass
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs'; // ⚡ Import necesario

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginForm: FormGroup;

  showModal = false;
  modalMessage = '';
  modalType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  async login() {
    // ⚡ Marca todos los controles como tocados desde el primer clic
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    const { username, password } = this.loginForm.value;

    try {
      // ⚡ Convierte el observable en promesa para evitar doble clic
      const res = await firstValueFrom(this.authService.login(username, password));

      this.authService.saveToken(res.token);
      this.modalMessage = 'Inicio de sesión exitoso. ¡Bienvenido!';
      this.modalType = 'success';
      this.showModal = true;
      // Forzar detección de cambios en caso de que la respuesta llegue fuera de la zona Angular
      this.cdr.detectChanges();

      setTimeout(() => {
        this.showModal = false;
        this.router.navigate(['/home']);
      }, 1500);

    } catch (err: any) {
      this.modalMessage =
        err.error?.error || 'Error de inicio de sesión. Usuario y/o contraseña incorrecta.';
      this.modalType = 'error';
      this.showModal = true;
      // Forzar detección de cambios para mostrar el modal inmediatamente
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.showModal = false;
  }
}
