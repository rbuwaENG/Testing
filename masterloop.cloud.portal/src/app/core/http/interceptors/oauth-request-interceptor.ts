import { Injectable, Injector } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/services';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private injector: Injector,
    private auth: AuthenticationService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const auth = this.injector.get(AuthenticationService);
    request = request.clone({
      setHeaders: { Authorization: `Bearer ${auth.oAuthToken.token}` },
    });
    //auth.oAuthToken.token
    return next.handle(request).pipe(
      tap(
        () => {},
        (err: any) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 401) {
              auth.clearSessionAndLocalStorage();
              this.auth.unAuthenticate();
              this.router.navigate(['/account/signin']);
            } else {
              return;
            }
          }
        }
      )
    );
  }
}
