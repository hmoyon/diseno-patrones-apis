import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EmployeePageComponent } from './components/employee-page/employee-page.component';
import { EmployeeFormComponent } from './components/employee-form/employee-form.component';
import { EmployeeTableComponent } from './components/employee-table/employee-table.component';
import { LoginPageComponent } from './components/login-page/login-page.component';
import { LoginFormComponent } from './components/login-form/login-form.component';
import { authInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    EmployeePageComponent,  // Smart
    EmployeeFormComponent,  // Dumb
    EmployeeTableComponent, // Dumb
    LoginPageComponent,     // Smart
    LoginFormComponent,     // Dumb
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}