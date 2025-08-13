import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppSettings } from '.';
import { BaseService } from './base.service';
import { LocalStorageService } from './local-storage.service';

@Injectable({
    providedIn: 'root'
  })
  export class UserService extends BaseService {

    headers: HttpHeaders;
    options : any;

    constructor(
        protected http: HttpClient,
        protected appSettings: AppSettings,
        protected cache: LocalStorageService
      ) {
        super(http, appSettings, cache);
        this.headers = new HttpHeaders().append('Content-Type', 'application/json');
        this.options = { headers: this.headers};
      }

      // get user permissions
      getUserPermission() {
        return this.http.get(this.appSettings.api_url + 'api/users/self');    
      }

      getAllUsers() {
        return this.http.get(this.appSettings.api_url + 'api/users');
      }

      editExistingUser(email, userData): Observable<any> {
        return this.http.put(this.appSettings.api_url + 'api/users/'+email, 
        JSON.stringify(userData), this.options);
      }

      createUser(newUser): Observable<any>  {
        return this.http.post(
          this.appSettings.api_url + 'api/users',
          JSON.stringify(newUser), {
            headers: { 'Content-Type': 'application/json' },
            observe: 'response' as 'body',
            responseType: 'text'
          }
        );
      }

      deleteUser(email) {
        return this.http.delete(this.appSettings.api_url + 'api/users/'+email);
      }

      // Two-Factor Authentication methods
      getUsersTwoFactorStatus() {
        return this.http.get(this.appSettings.api_url + 'api/TwoFactorAuth/users-status');
      }

      checkTwoFactorRequired(email: string) {
        return this.http.post(this.appSettings.api_url + 'api/TwoFactorAuth/check-required', {
          email: email
        });
      }

      adminEnableTwoFactor(userEmail: string) {
        return this.http.post(this.appSettings.api_url + 'api/TwoFactorAuth/admin/enable', {
          userEmail: userEmail
        });
      }

      adminDisableTwoFactor(userEmail: string) {
        return this.http.post(this.appSettings.api_url + 'api/TwoFactorAuth/admin/disable', {
          userEmail: userEmail
        });
      }

      verifyTwoFactor(email: string, totpCode: string) {
        return this.http.post(this.appSettings.api_url + 'api/TwoFactorAuth/verify', {
          email: email,
          totpCode: totpCode
        });
      }

      sendTwoFactorCode(email: string) {
        return this.http.post(this.appSettings.api_url + 'api/TwoFactorAuth/send-code/' + email, {});
      }
  } 