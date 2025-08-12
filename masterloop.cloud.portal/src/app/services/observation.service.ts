import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { LocalStorageService } from '../services/local-storage.service';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class ObservationService extends BaseService {
  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService
  ) {
    super(http, appSettings, cache);
  }

  //Get observation details for a device
  getObservationValues(
    deviceId: any,
    observationId: any,
    from: Date,
    to: Date,
    name = null
  ): Observable<any> {
    let _from;
    let _to;
    if (name == 'User Defined') {
      _from = moment(from).local().format('YYYY-MM-DDTHH:mm:ss');
      _to = moment(to).local().format('YYYY-MM-DDTHH:mm:ss');
    } else {
      _from = from.toISOString();
      _to = to.toISOString();
    }

    return this.http.get(
      `${this.appSettings.api_url}api/devices/${deviceId}/observations/${observationId}/observations?fromTimestamp=${_from}&toTimestamp=${_to}`
    );
  }

  getPulse(deviceId: any): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + deviceId + '/pulse/0/current'
    );
  }
}
