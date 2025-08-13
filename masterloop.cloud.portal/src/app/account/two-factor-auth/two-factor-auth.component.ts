import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { LoggerService } from '../../services';
import { LocalStorageKeys } from '../../core/constants';
import { Subscription, interval } from 'rxjs';
import * as moment from 'moment';

@Component({
  selector: 'app-two-factor-auth',
  templateUrl: './two-factor-auth.component.html',
  styleUrls: ['./two-factor-auth.component.scss'],
})
export class TwoFactorAuthComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public isLoading: boolean = false;
  public countdown: number = 30;
  public canResend: boolean = false;
  public userEmail: string = '';
  public errorMessage: string = '';
  public successMessage: string = '';
  
  private countdownSubscription: Subscription;
  private routeSubscription: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private loggerService: LoggerService
  ) {}

  ngOnInit() {
    this.buildForm();
    this.getUserEmailFromRoute();
    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private buildForm() {
    this.form = new FormGroup({
      totpCode: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
        Validators.pattern('^[0-9]{6}$')
      ])
    });
  }

  private getUserEmailFromRoute() {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.userEmail = params['email'] || '';
      if (!this.userEmail) {
        this.router.navigate(['/signin']);
      }
    });
  }

  private startCountdown() {
    this.countdown = 30;
    this.canResend = false;
    
    this.countdownSubscription = interval(1000).subscribe(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.canResend = true;
        this.countdownSubscription.unsubscribe();
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const totpCode = this.form.get('totpCode').value;

      // Verify the TOTP code
      this.userService.verifyTwoFactor(this.userEmail, totpCode).subscribe(
        (result: any) => {
          this.isLoading = false;
          if (result && result.isValid) {
            this.successMessage = 'Two-factor authentication successful!';
            this.loggerService.showSuccessfulMessage('Login successful!');
            
            // Complete the login process
            this.completeLogin();
          } else {
            this.errorMessage = result?.message || 'Invalid verification code';
            this.form.get('totpCode').setValue('');
          }
        },
        error => {
          this.isLoading = false;
          this.errorMessage = 'Verification failed. Please try again.';
          this.form.get('totpCode').setValue('');
        }
      );
    }
  }

  private completeLogin() {
    // Set the last updated time
    var currentUTC = moment.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
    localStorage.setItem(
      LocalStorageKeys.DEVICES_LAST_UPDATED_ON,
      currentUTC
    );

    // Navigate based on last selected folder
    let lastSelectedFolder = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LAST_FOLDER)
    );
    
    setTimeout(() => {
      if (lastSelectedFolder != null) {
        if (lastSelectedFolder == 'recent') {
          this.router.navigateByUrl('/devices/filter/recent');
        } else if (lastSelectedFolder == 'starred') {
          this.router.navigateByUrl('/devices/filter/starred');
        } else if (lastSelectedFolder == 'found') {
          this.router.navigateByUrl('/devices/all');
        } else if (lastSelectedFolder == '1') {
          this.router.navigateByUrl('/');
        } else if (lastSelectedFolder == 'All') {
          this.router.navigateByUrl('/devices/all');
        } else {
          this.router.navigateByUrl(
            '/devices/listingbytemplate/' + lastSelectedFolder
          );
        }
      } else {
        this.router.navigateByUrl('/');
      }
    }, 1000);
  }

  resendCode() {
    if (!this.canResend) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.sendTwoFactorCode(this.userEmail).subscribe(
      (result: any) => {
        this.isLoading = false;
        if (result && result.message) {
          this.successMessage = 'New verification code sent!';
          this.startCountdown();
          this.form.get('totpCode').setValue('');
        } else {
          this.errorMessage = 'Failed to send verification code. Please try again.';
        }
      },
      error => {
        this.isLoading = false;
        this.errorMessage = 'Failed to send verification code. Please try again.';
      }
    );
  }

  goBackToLogin() {
    this.router.navigate(['/signin']);
  }

  onCodeInput(event: any) {
    const value = event.target.value;
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      this.form.get('totpCode').setValue(value.replace(/\D/g, ''));
    }
    
    // Auto-submit when 6 digits are entered
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      this.onSubmit();
    }
  }
}