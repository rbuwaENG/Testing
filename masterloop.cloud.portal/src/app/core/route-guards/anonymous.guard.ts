import { Injectable } from '@angular/core';
import {
  Router,
  Route,
  CanActivate,
  CanLoad,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthenticationService } from '../../services/authentication.service';

@Injectable()
export class AnonymousGuard implements CanActivate, CanLoad {
  constructor(private router: Router, private auth: AuthenticationService) {}

  validate() {
    if (this.auth.oAuthToken.isValid) {
      if (this.router.url === '/') {
        let redirectRoute = this.router.config.find(
          (route: Route) =>
            route.path === '' &&
            route.pathMatch === 'full' &&
            !!route.redirectTo
        );
        this.router.navigate([redirectRoute ? redirectRoute.redirectTo : '']);
      }
      return false;
    }
    return true;
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.validate();
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.canActivate(route, state);
  }

  canLoad(route: Route): boolean {
    return this.validate();
  }
}
