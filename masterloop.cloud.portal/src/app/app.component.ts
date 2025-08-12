import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
// import { HttpInterceptorService } from 'ng-http-interceptor';
import { Router } from '@angular/router';
// import {
//   AppendRequestOptionsRequestInterceptor,
//   JsonRequestInterceptor,
//   JsonResponseInterceptor,
//   OAuthRequestInterceptor,
//   OAuthResponseInterceptor
// } from './core/http/interceptors';
import { AuthenticationService } from './services/authentication.service';
import { ConfigService } from './config.service';
import { AppSettings } from './services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
  // template: `
  //   <router-outlet></router-outlet>
  // `
})
export class AppComponent implements OnInit{

  token;

  constructor(
    protected router: Router,
    translate: TranslateService,
    // httpInterceptor: HttpInterceptorService,
    public auth: AuthenticationService,
    private configService: ConfigService,
    protected aptSet : AppSettings,
  ) {
    translate.setTranslation('en', {});
    translate.setDefaultLang('en');

    // //let browserLang: string = translate.getBrowserLang();
    // //translate.use(browserLang.match(/en|fr|nb/) ? browserLang : 'en');
    // //translate.use(browserLang);
    // var requestOptionsAppendInterceptor = new AppendRequestOptionsRequestInterceptor();
    // var jsonRequestInterceptor = new JsonRequestInterceptor();
    // var oAuthInterceptor = new OAuthRequestInterceptor(auth);
    // var jsonResponseInterceptor = new JsonResponseInterceptor();
    // var oAuthResponseInterceptor = new OAuthResponseInterceptor(this.router, auth);
    // /*
    //   Regex to match any NOT having token
    //   REF: http://stackoverflow.com/questions/406230/regular-expression-to-match-a-line-that-doesnt-contain-a-word
    // */
    // var regexToMatchURLOtherThanToken = /^((?!token).)*$/i;
    // httpInterceptor.request().addInterceptor((data, method, ctx) => requestOptionsAppendInterceptor.requestInterceptor(data, method, ctx));
    // httpInterceptor.request(regexToMatchURLOtherThanToken).addInterceptor((data, method, ctx) => jsonRequestInterceptor.requestInterceptor(data, method, ctx));
    // httpInterceptor.request(regexToMatchURLOtherThanToken).addInterceptor((data, method, ctx) => oAuthInterceptor.requestInterceptor(data, method, ctx));
    // httpInterceptor.response(regexToMatchURLOtherThanToken).addInterceptor((data, method, ctx) => oAuthResponseInterceptor.responseInterceptor(data, method, ctx));
    // httpInterceptor.response(regexToMatchURLOtherThanToken).addInterceptor((data, method, ctx) => jsonResponseInterceptor.responseInterceptor(data, method, ctx));
  }  

  ngOnInit() {
    this.token = this.auth.oAuthToken.token;
    this.aptSet.setValues(this.configService.readConfig());
  }
}
