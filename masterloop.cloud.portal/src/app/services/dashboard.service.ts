import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppSettings } from './app.settings';
import { BaseService } from './base.service';
import { LocalStorageService } from './local-storage.service';
import { TemplateDashboard } from "src/app/core/models/dashboard/template-dashboard"

@Injectable({
  providedIn: 'root'
})
export class DashboardService extends BaseService {
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

  public getAllTemplateDashboards(tId: string): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + `api/templates/${tId}/dashboards`,
      this.options
    );
  }

  public getTemplateDashboard(tId: string, dId: string): Observable<any> {
    return this.http.get(
      this.appSettings.api_url + `api/templates/${tId}/dashboards/${dId}`,
      this.options
    );
  }

  //Create new template dashboard
  public createTemplateDashboard(tId: string, dashboardObj: TemplateDashboard): Observable<any> {
    return this.http.post(
      this.appSettings.api_url + `api/templates/${tId}/dashboards`,
      JSON.stringify(dashboardObj),
      this.options
    );
  }

  //update template dashboard
  public updateTemplateDashboard(tId: string, dId: string, dashboardObj: TemplateDashboard): Observable<any> {
    return this.http.put(
      this.appSettings.api_url + `api/templates/${tId}/dashboards/${dId}`,
      JSON.stringify(dashboardObj),
      this.options
    );
  }

  //delete template dashboard
  public deleteTemplateDashboard(tId: string, dId: string): Observable<any> {
    return this.http.delete(
      this.appSettings.api_url + `api/templates/${tId}/dashboards/${dId}`,
      this.options
    );
  }
}
