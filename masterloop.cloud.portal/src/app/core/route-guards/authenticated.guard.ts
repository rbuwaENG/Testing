import { Injectable } from '@angular/core';
import { Router, Route, CanActivate, CanLoad, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationService } from '../../services/authentication.service';

@Injectable()
export class AuthenticatedGuard implements CanActivate, CanLoad {

  constructor(private router: Router, private auth: AuthenticationService) { }

  validateURL(toURL: string) {
    if (!this.auth.oAuthToken.isValid) {
      this.auth.redirectURL = toURL || null;
      this.auth.unAuthenticate();
      this.router.navigate(['/account/signin']);
      return false;
    }
    return true;
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.validateURL(state.url);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(route, state);
  }

  canLoad(route: Route): boolean {
    let url = `/${route.path}`;
    return this.validateURL(url);
  }
}