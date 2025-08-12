import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { LocalStorageService } from '../services/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DeviceService extends BaseService {
  private observationIds = new Subject<any>();
  start$ = this.observationIds.asObservable();
  headers: HttpHeaders;
  options: any;

  constructor(
    protected http: HttpClient,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService
  ) {
    super(http, appSettings, cache);
    this.headers = new HttpHeaders().append('Content-Type', 'application/json');
    this.options = { headers: this.headers };
  }

  //Import observations for a specific device
  importDevices(Id, observations, authenticationKey): Observable<any> {
    let headers = new HttpHeaders();
    headers.append('Authorization', 'Basic ' + authenticationKey);
    headers.append('Content-Type', 'text/csv');
    return this.http.post(
      this.appSettings.api_url + 'api/devices/' + Id + '/observations/import',
      observations,
      { headers: headers }
    );
  }

  getDevices(): Observable<any> {
    return this.http.get(this.appSettings.api_url + 'api/devices');
  }

  //Get data for specific device
  getDeviceDetails(Id): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + Id + '/details'
    );
  }

  //Get templates for add new device
  getTemplates(): Observable<any> {
    return this.http.get(this.appSettings.api_url + 'api/templates');
  }

  //Get unique MID for add new device
  getUniqueMID(): Observable<any> {
    return this.http.get(this.appSettings.api_url + 'api/tools/uniquemid', {
      responseType: 'text',
    });
  }

  //Create new device
  createDevice(device): Observable<any> {
    return this.http.post(
      this.appSettings.api_url + 'api/devices',
      JSON.stringify(device),
      this.options
    );
  }

  //Update a device
  updateDevice(device): Observable<any> {
    return this.http.post(
      this.appSettings.api_url + 'api/devices/' + device.MID,
      JSON.stringify(device),
      this.options
    );
  }

  //Delete device
  deleteDevice(MID): Observable<any> {
    return this.http.delete(this.appSettings.api_url + 'api/devices/' + MID);
  }

  //Get observation details for a device
  getObservationDetails(Id): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + Id + '/observations/current2'
    );
  }

  //Get command details for a device
  getCommandDetails(Id): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + Id + '/commands/queue'
    );
  }

  //Get device latest login time
  getDeviceActivities(Id): Observable<any> {
    return this.http.get(
      this.appSettings.api_url +
        'api/devices/' +
        Id +
        '/activity/latest/timestamp'
    );
  }

  //Get device pulses
  getDevicePulses(Id): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + Id + '/pulse/0/current'
    );
  }

  //Update send commands for a device
  updateSendCommand(
    MID,
    CommandId,
    requestObject,
    originInfo = null
  ): Observable<any> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    //headers = headers.append('OriginApplication', this.appSettings.origin_application);
    //headers = headers.append('OriginAddress', originInfo['OriginAddress']);
    //headers = headers.append('OriginReference', originInfo['OriginReference']);

    // this.headers = new HttpHeaders().append('OriginApplication', this.appSettings.origin_application);
    // this.headers = new HttpHeaders().append('OriginAddress', originInfo['OriginAddress']);
    // this.headers = new HttpHeaders().append('OriginReference', originInfo['OriginReference']);
    // this.options = { headers: this.headers};

    // console.log(this.options);

    return this.http.post(
      this.appSettings.api_url +
        'api/devices/' +
        MID +
        '/commands/' +
        CommandId,
      JSON.stringify(requestObject),
      { headers: headers }
    );
  }

  //Get device related permissions
  getDevicePermissions(MID): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + MID + '/permissions'
    );
  }

  //Get device related permissions self
  getDevicePermissionsSelf(MID): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + MID + '/permissions/self'
    );
  }

  getDeviceTemplate(MID): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/devices/' + MID + '/template'
    );
  }
  //Get device snapshot
  getSnapshot(deviceList): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    };
    return this.http.post(
      this.appSettings.api_url + 'api/tools/snapshot/current',
      JSON.stringify(deviceList),
      this.options
    );
  }
  /**
   * Get device meta and device details
   * @param needMetaData (boolean)
   * @param needDeviceData (boolean)
   */
  getDeviceMetaAndDeviceData(needMetaData, needDeviceData): Observable<any> {
    return this.http.get(
      this.appSettings.api_url +
        'api/devices?includeMetadata=' +
        needMetaData +
        '&includeDetails=' +
        needDeviceData
    );
  }

  getDeviceDetailsAsCSV(
    needMetaData,
    needDeviceData,
    updatedAfter = null
  ): Observable<any> {
    //console.log('inside csv');
    let headers = new HttpHeaders().set('Accept', 'text/csv');
    //headers.append('Accept', 'text/csv');
    if (updatedAfter != null) {
      return this.http.get(
        this.appSettings.api_url +
          'api/devices?includeMetadata=' +
          needMetaData +
          '&includeDetails=' +
          needDeviceData +
          '&updatedAfter=' +
          updatedAfter,
        { headers: headers, responseType: 'text' }
      );
    }

    return this.http.get(
      this.appSettings.api_url +
        'api/devices?includeMetadata=' +
        needMetaData +
        '&includeDetails=' +
        needDeviceData,
      { headers: headers, responseType: 'text' }
    );
  }

  changeObservations(observationIds) {
    this.observationIds.next(observationIds);
  }
}
