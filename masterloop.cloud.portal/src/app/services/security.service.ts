import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { LocalStorageService } from '../services/local-storage.service';
import { DeviceSecurity } from '../core/models/device-security';

@Injectable({
  providedIn: 'root'
})
export class SecurityService extends BaseService {
  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService
  ) {
    super(http, appSettings, cache);
  }

  //Get security details for a device
  getSecurityValues(deviceId: string): Observable<DeviceSecurity> {
    return this.http.get<DeviceSecurity>(
      `${this.appSettings.api_url}api/devices/${deviceId}/securedetails`
    );
  }
}
