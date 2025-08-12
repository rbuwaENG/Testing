import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { LiveConnectRequest } from '../core/models';
import { LocalStorageService } from '../services/local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LiveConnectionService extends BaseService {
  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService
  ) {
    super(http, appSettings, cache);
  }

  //Get live connection details
  getLiveConnectionDetails(
    requestOptions: LiveConnectRequest[]
  ): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({'Content-Type': 'application/json'})
    }
    return this.http.post(
      `${this.appSettings.api_url}api/tools/liveconnect`,
      JSON.stringify(requestOptions), httpOptions
    );
  }
}
