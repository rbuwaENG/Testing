import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { Subject } from 'rxjs';
import { LocalStorageService } from '../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { DeviceActivityColors } from '../core/constants/device-activity-colors';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService extends BaseService {  
  

  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService,
    protected dbService : NgxIndexedDBService
  ) {
    super(http, appSettings, cache);
  }
  
  getDevicesFromIndexedDb() {
    return this.dbService.getAll('devices');
  }
  
  deleteDeviceFromIndexedDb(MID) {
    this.getDevicesFromIndexedDb().subscribe((result) => {
      if(result.length > 0) {
        let allDevices = result[0].Value;
        let device = allDevices.findIndex(d =>d.MID == MID);
        if(device != null) {
          allDevices.splice(device, 1);
          this.dbService.delete('devices', 2)
          this.dbService.add('devices', {
            Id : 2,
            Value: allDevices,
          });
        }
        return true;
      }
    });
  }

  updateDeviceCache(data, lastPulse) {
    const now = moment.utc();
    var currentPulse = moment(lastPulse);
    var hoursAgoLatestPulse = now.diff(currentPulse, "hours").toString();
    this.getDevicesFromIndexedDb().subscribe((result) => {
      
      if(result.length > 0) {
        let allDevices = result[0].Value;
        let device = allDevices.findIndex(d =>d.MID == data.MID);
        if(device != null) {
          allDevices.splice(device, 1);
          let newDevice = {};
          newDevice['CreatedOn'] = data.CreatedOn; 
          newDevice['Description'] = data.Description; 
          if(lastPulse == 'Never') {
            newDevice['LatestPulse'] = null; 
          } else {
            newDevice['LatestPulse'] = hoursAgoLatestPulse; 
          }
          newDevice['MID'] = data.MID; 
          newDevice['Name'] = data.Name; 
          newDevice['Metadata'] = null; 
          newDevice['TemplateId'] = data.TemplateId; 
          newDevice['UpdatedOn'] = data.UpdatedOn; 
          allDevices.push(newDevice);

          this.dbService.delete('devices', 2)
          this.dbService.add('devices', {
            Id : 2,
            Value: allDevices,
          });
        }
      }
    });
  }
}
