import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { SiteSetting } from 'src/app/services';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.component.html',
  styleUrls: ['./forgot.component.scss']
})
export class ForgotComponent implements OnInit {
  public form: FormGroup;
  public submitted = false;
  public isLoading = false;

  constructor(
    private router: Router,
    private siteSettings: SiteSetting,
    private authService: AuthenticationService,
    private snackBar: MatSnackBar
  ) {
    this.siteSettings.initTheme();
  }

  ngOnInit() {
    this.form = new FormGroup({
      email: new FormControl(null, [Validators.required, Validators.email])
    });
  }

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    this.isLoading = true;
    const email = this.form.value.email;
    const resetURL = location.origin + '/#' + this.router.createUrlTree(['/account/reset-password'],{ queryParams: { email: email, token: '{token}' } }).toString();

    this.authService.forgotPassword(email, resetURL).subscribe({
      next: () => {
        this.snackBar.open('Password reset link sent. Please check your email.', 'Close', {
          duration: 5000,
          panelClass: ['snackbar-success']
        });
        this.isLoading = false;
      },
      error: (err) => {
        const message = err.error?.message || 'An error occurred. Please try again.';
        this.snackBar.open(message, 'Close', {
          duration: 5000,
          panelClass: ['snackbar-error']
        });
        this.isLoading = false;
      }
    });
  }
}
