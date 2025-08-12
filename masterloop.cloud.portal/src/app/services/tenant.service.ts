import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { LocalStorageService } from '../services/local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class TenantService extends BaseService {
  
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

  //Get tenants
  getTenants(): Observable<any> {
    return this.http.get(this.appSettings.api_url + 'api/tenants/');
  }

  getTenantUsers(tenantId) {
    return this.http.get(this.appSettings.api_url + 'api/tenants/'+tenantId+'/users');
  }

  updateTenantUserPermission(tenantId, userPermissionData) {
    return this.http.post(
          this.appSettings.api_url + 'api/tenants/'+tenantId+'/users',
          JSON.stringify(userPermissionData), this.options
    );
  }

  deleteTenantUser(tenantId, user): Observable<any> {
    return this.http.delete(this.appSettings.api_url + 'api/tenants/'+tenantId+'/users/'+user.AccountId);
  }

  createNewTenant(newTenant) {
    return this.http.post(
      this.appSettings.api_url + 'api/tenants',
      JSON.stringify(newTenant), this.options
    ); 
  }

  allocateExistingUserToTenant(tenantId, tenantUser) {
    return this.http.post(
      this.appSettings.api_url + 'api/tenants/'+tenantId+'/users',
      JSON.stringify(tenantUser), this.options
);
  }
}
