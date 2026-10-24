import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials } from '../../models/auth';

/**
 * SMART COMPONENT — Orquestador del login.
 * Llama al servicio, decide la redirección y muestra los errores.
 */
@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = false;
  errorMessage: string | null = null;
  readonly sessionExpired = this.route.snapshot.queryParamMap.has('expired');

  onLogin(credentials: LoginCredentials): void {
    this.loading = true;
    this.errorMessage = null;

    this.authService
      .login(credentials)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/employees';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err: Error) => (this.errorMessage = err.message),
      });
  }
}