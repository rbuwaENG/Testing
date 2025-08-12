import { Directive, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { SiteSetting } from 'src/app/services';
import { AuthenticationService } from '../../services/authentication.service';

@Directive({
  selector: '[sign-out]',
})
export class SignOutDirective {
  constructor(
    private router: Router,
    private auth: AuthenticationService,
    private siteSetting: SiteSetting
  ) {}

  @HostListener('click') onClick() {
    this.siteSetting.clearSelectedLocalStorageKeys();
    this.auth.unAuthenticate();
    this.siteSetting.trackStyle.clear();
    this.siteSetting.deviceStatusFilter.clear();
    this.router.navigate(['/account/signin']);
  }
}
