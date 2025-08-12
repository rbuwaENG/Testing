import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { LocalStorageService } from '../services/local-storage.service';
import { QuantityItem } from '../core/interfaces/quantity-unit.interface';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class TemplateService extends BaseService {
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

  //variant related section
  getTemplateVariants(TID): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/templates/' + TID + '/firmware/variants'
    );
  }

  getVariantFirmwareDetails(TID, VID): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/templates/' + TID + '/firmware/' + VID
    );
  }

  getVariantCurrentFirmwareDetails(TID, VID): Observable<any> {
    return this.http.get(
      this.appSettings.api_url +
        'api/templates/' +
        TID +
        '/firmware/' +
        VID +
        '/current'
    );
  }

  setVariantCurrentFirmWare(TID, VID, ReleaseId): Observable<any> {
    return this.http.put(
      this.appSettings.api_url +
        'api/templates/' +
        TID +
        '/firmware/' +
        VID +
        '/current',
      ReleaseId,
      this.options
    );
  }

  //Get template details
  getTemplateDetails(Id): Observable<any> {
    return this.http.get(this.appSettings.api_url + 'api/templates/' + Id + '');
  }

  //Get firmware details
  getFirmwareDetails(Id): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/templates/' + Id + '/firmware'
    );
  }

  //Get current firmware details
  getCurrentFirmwareDetails(TId): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + 'api/templates/' + TId + '/firmware/current'
    );
  }

  //Create firmware release
  creatfirmwareRelease(firmware): Observable<any> {
    return this.http.post(
      this.appSettings.api_url +
        'api/templates/' +
        firmware.DeviceTemplateId +
        '/firmware',
      JSON.stringify(firmware),
      this.options
    );
  }

  getTemplates(): Observable<any> {
    return this.http.get(this.appSettings.api_url + 'api/templates/');
  }

  //Create new template
  createTemplate(tenantId, template): Observable<any> {
    return this.http.post(
      this.appSettings.api_url + 'api/tenants/' + tenantId + '/templates',
      JSON.stringify(template),
      this.options
    );
  }

  //Update template
  updateTemplate(templateId, template): Observable<any> {
    return this.http.put(
      this.appSettings.api_url + 'api/templates/' + templateId,
      JSON.stringify(template),
      this.options
    );
  }

  //Set current firmware
  setCurrentFirmWare(TId, releaseId): Observable<any> {
    return this.http.put(
      this.appSettings.api_url + 'api/templates/' + TId + '/firmware/current',
      releaseId,
      this.options
    );
  }

  //get units
  getUnits(): Observable<any> {
    return this.http.get(this.appSettings.api_url + 'api/tools/units');
  }

  //get Quantities
  getQuantities(): Observable<QuantityItem[]> {
    const cachedQuantities = this.cache.getQuantities();
    if (cachedQuantities) {
      return of(cachedQuantities);
    } else {
      return this.getUnits().pipe(
        tap((data) => {
          const quantities = data['Quantities'] as QuantityItem[];
          this.cache.setQuantities(quantities);
        })
      );
    }
  }

  //get Abbreviation
  getAbbreviation(quantities: QuantityItem[], quantityId: number, unitId: number) {
    let unit = null;
    let quantity = quantities.find((x) => x.Id === quantityId);
    if (quantity.Units) {
      unit = (quantity.Units.find((x) => x.Id === unitId)).Abbreviation;
    }
    return unit;
  }
}
