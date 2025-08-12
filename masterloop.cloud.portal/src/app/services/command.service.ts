import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { DeviceService } from './device.service';
import { LocalStorageService } from '../services/local-storage.service';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class CommandService extends BaseService {
  commands: any[] = [];

  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    private deviceService: DeviceService,
    protected cache: LocalStorageService
  ) {
    super(http, appSettings, cache);
  }

  //Get device commands ...
  getDeviceCommands(deviceId: any, from: Date, to: Date, name = null): Observable<any> {

    let _from;
    let _to;
    if(name == "User Defined") {
      _from = moment(from).local().format('YYYY-MM-DDTHH:mm:ss');
      _to = moment(to).local().format('YYYY-MM-DDTHH:mm:ss')
    } else {
      _from  = from.toISOString();
      _to = to.toISOString();      
    }

    return this.http.get(
      `${
        this.appSettings.api_url
      }api/devices/${deviceId}/commands?fromTimestamp=${_from}&toTimestamp=${_to}`
    );
  }

  getDeviceCommandWithArguments(deviceId: any, from: Date, to: Date , name = null) {
    return forkJoin([
      this.getDeviceCommands(deviceId, from, to, name),
      this.loadDeviceCommands(deviceId)
    ]);
  }

  loadDeviceCommands(deviceId) {
    return this.deviceService.getDeviceDetails(deviceId);
  }
}
