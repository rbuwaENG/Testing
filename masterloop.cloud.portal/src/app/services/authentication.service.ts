import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Observer, ConnectableObservable } from 'rxjs';
import { publish } from 'rxjs/operators';
import { BaseService } from './base.service';
import { AppSettings } from './app.settings';
import {
  AuthenticationCredentials,
  OAuthTokenMetadata,
  OAuthToken
} from '../core/models/authentication';
import { LocalStorageKeys } from '../core/constants';
import { PropertyExtension } from '../core/extensions';
import { LocalStorageService } from '../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService extends BaseService {
  public _oAuthToken: OAuthToken;
  private _hookableAuthenticationRequest: ConnectableObservable<boolean>;
  public redirectURL: string;

  public get oAuthToken(): OAuthToken {
    if (!this._oAuthToken) {
      var valuesFromStorage = {};
      try {
        valuesFromStorage = JSON.parse(
          localStorage.getItem(LocalStorageKeys.OAUTH_TOKEN) || '{}',
          OAuthToken.JSONParseReviver
        );
      } catch (error) {
        console.log(
          'Skipping error. Token data in storage is either corrupted/depreciated ...',
          error
        );
      }
      this._oAuthToken = Object.assign(new OAuthToken(0), valuesFromStorage);
    }
    /* User has to forcefully, logged-out if the auth token version is below minimum... */
    if (this._oAuthToken.version < this.appSettings.auth_token_version) {
      this.unAuthenticate();
    }
    return this._oAuthToken;
  }

  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService,
    private dbService: NgxIndexedDBService
  ) {
    super(http, appSettings, cache);
  }

  protected updateOAuthToken(value: OAuthTokenMetadata) {
    this._oAuthToken.update(value, this.appSettings.auth_token_version);
    localStorage.setItem(
      LocalStorageKeys.OAUTH_TOKEN,
      JSON.stringify(this._oAuthToken)
    );
  }

  protected updateLoginUserLocalStorage(credentials: AuthenticationCredentials) {
    let userName = credentials.username;
    localStorage.setItem(
      LocalStorageKeys.LOGIN_USER,
      JSON.stringify(userName)
    );
  }

  protected _authenticate(
    observer: Observer<boolean>,
    credentials: AuthenticationCredentials
  ): void {
    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    headers.append('Content-Type', 'charset=utf-8');

    this.http
      .post(
        this.appSettings.api_url + 'token',
        credentials.parseAsURLSearchParams()
        // { headers: headers }
      )
      .subscribe(
        response => {
          this.updateOAuthToken(OAuthToken.parseFromServer(response));
          this.updateLoginUserLocalStorage(credentials);
          observer.next(true);
          observer.complete();
          this._hookableAuthenticationRequest = null;
        },
        (error: Error) => {
          observer.error(error);
          observer.complete();
          this._hookableAuthenticationRequest = null;
        }
      );
  }

  public authenticate(
    credentials: AuthenticationCredentials
  ): Observable<boolean> {
    if (!this._hookableAuthenticationRequest) {
      this._hookableAuthenticationRequest = new Observable<boolean>(
        (observer: Observer<boolean>) =>
          this._authenticate(observer, credentials)
      ).pipe(publish()) as ConnectableObservable<boolean>;
      this._hookableAuthenticationRequest.connect();
    }

    return this._hookableAuthenticationRequest;
  }

  public unAuthenticate(): void {
    this.updateOAuthToken(null);
    this.clearSessionAndLocalStorage();
  }

  public clearSessionAndLocalStorage() {
    this.dbService.clear('devices').subscribe((devices) => {
      localStorage.removeItem(LocalStorageKeys.LAST_SYNC_DEVICE_LIST);
      localStorage.removeItem(LocalStorageKeys.CACHED_TEMPLATES);
      sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
      localStorage.removeItem(LocalStorageKeys.CURRENT_POSITION);
      
    });
    //this.cache.clearDeviceListCache();
    // localStorage.removeItem(LocalStorageKeys.LAST_SYNC_DEVICE_LIST);
    // localStorage.removeItem(LocalStorageKeys.CACHED_TEMPLATES);
    // sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
    // localStorage.removeItem(LocalStorageKeys.CURRENT_POSITION);
  }
  
  public forgotPassword(email: string, resetURL: string): Observable<any> {
    return this.http.post(
      `${this.appSettings.api_url}api/account/forgot-password`,
      { email,
        resetURL
       }
    );
  }

  public resetPassword(email: string, token: string, newPassword: string): Observable<any> {
    return this.http.post(
      `${this.appSettings.api_url}api/account/reset-password`,
      {
        email,
        token,
        newPassword
      }
    );
  }
}
