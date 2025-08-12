import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { SiteSetting } from 'src/app/services';

@Component({
  selector: 'app-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss']
})
export class ResetComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  hideNewPassword = true;
  hideConfirmPassword = true;
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthenticationService,
    private snackBar: MatSnackBar,
    private router: Router,
    private siteSettings: SiteSetting
  ) {this.siteSettings.initTheme();}

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email') || '';
    const token = this.route.snapshot.queryParamMap.get('token') || '';

    this.form = this.fb.group(
      {
        email: [{ value: email, disabled: true }, [Validators.required, Validators.email]],
        token: [{ value: token, disabled: true }, Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  // Custom validator to compare passwords
  private passwordsMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;

    const { email, token, newPassword } = this.form.getRawValue();

    this.authService.resetPassword(email, token, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Password reset successfully!', 'Close', { duration: 5000 });
        this.router.navigate(['/signin']);
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Failed to reset password.', 'Close', { duration: 5000 });
      }
    });
  }
}
