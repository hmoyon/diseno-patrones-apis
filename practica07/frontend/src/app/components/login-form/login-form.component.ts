import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LoginCredentials } from '../../models/auth';

/**
 * DUMB COMPONENT — Formulario de login.
 * Entrada: @Input() isLoading. Salida: @Output() submitLogin.
 */
@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  @Input() isLoading = false;
  @Output() readonly submitLogin = new EventEmitter<LoginCredentials>();

  // Estado local del formulario, aislado de la vista padre.
  formModel: LoginCredentials = { email: '', password: '' };

  onSubmit(): void {
    const email = this.formModel.email.trim();
    if (!email || !this.formModel.password) return;
    this.submitLogin.emit({ email, password: this.formModel.password });
  }
}