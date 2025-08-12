import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageKeys } from 'src/app/core/constants';
import { DeviceStatusColorGenerator } from 'src/app/core/helpers/device-color-generator.helper';
import { DeviceService, LoggerService, TemplateService } from 'src/app/services';
import { catchError } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'app-device-dashboard',
  templateUrl: './device-dashboard.component.html',
  styleUrls: ['./device-dashboard.component.scss']
})
export class DeviceDashboardComponent implements OnInit {

  MID: any;
  TID: any;
  selectedDashboard: any;
  selectedObservations = [];
  selectedTemplate: any;
  selectedTemplateObservations = [];
  plotObservations = [];
  mapObservations = [];
  tableObservations = [];
  dashboardChanged: boolean = false;
  dashboardReset: boolean = false;
  deviceStatusColor;
  listOfDashboards = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loggerService: LoggerService,
    private templateService: TemplateService,
    private deviceService: DeviceService,
    private location: Location,
    private dashboardService: DashboardService
  ) {
    this.MID = this.route.snapshot.params['deviceId'];
  }

  ngOnInit(): void {
    let state = this.location.getState();
    if (state != null) {
      this.TID = state['TemplateId'];
    }
    this.getDeviceDetails();
  }

  getDeviceDetails() {
    let getDevicePulse = this.deviceService.getDevicePulses(this.MID).pipe(catchError((error) => of(error)));
    let deviceDetails = this.deviceService.getDeviceDetails(this.MID).pipe(catchError((error) => of(error)));
    let templateList = this.templateService.getTemplates().pipe(catchError((error) => of(error)));

    forkJoin([deviceDetails, getDevicePulse, templateList]).subscribe((res) => {
      if (res != null) {
        this.TID = res[0]['TemplateId'];
        let pulseTime = res[1]?.To;
        let tenantList = res[2];

        this.getSelectedTemplateFromList(tenantList);
        this.handleDeviceColorCode(pulseTime);
        this.getDashboardsByTemplateId(this.TID);
      }
    });
  }

  getDashboardsByTemplateId(tId: string) {
    this.dashboardService.getAllTemplateDashboards(tId).subscribe(res => {
      if(!res){
        this.listOfDashboards = [];
        return;
      }
      
      res.sort((f, n): number => {
        if (f.Index < n.Index) return -1;
        if (f.Index > n.Index) return 1;
        return 0;
      });
      this.listOfDashboards = res;
    });
  }

  handleDeviceColorCode(pulseTime) {
    this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
      pulseTime,
      'UTC'
    );
  }

  navigateToList() {
    this.router.navigateByUrl('devices/all');
  }

  // getTemplateFromLocalStorage() {
  //   let templateList = JSON.parse(
  //     localStorage.getItem(LocalStorageKeys.CACHED_TEMPLATES)
  //   );
  //   if(templateList == null) {
  //     this.templateService.getTemplates().subscribe((data: any) => {
  //       this.getSelectedTemplateFromList(data);
  //     }); 
  //   } else {
  //     this.getSelectedTemplateFromList(templateList);
  //   }
    
  // }

  getSelectedTemplateFromList(templateList) {
    this.selectedTemplate = templateList.filter(t => t.Id == this.TID)[0];
    if (typeof this.selectedTemplate !== 'undefined') {
      this.selectedTemplateObservations = this.selectedTemplate['Observations']
    }
  }

  navigateToSelectedDashboard(id: any) {
    this.router.navigateByUrl('devices/' + this.MID + '/dashboards/' + id);
  }

  getObservationList(observations: any[]){
    let observationIds = observations.map(o => o.Id);
    let uniqueObservationIds = observationIds.filter((x, i, a) => a.indexOf(x) === i);
    let dashboardObservations = this.selectedTemplateObservations.filter(o=>uniqueObservationIds.includes(o.Id)).map(o => o.Name);
    return dashboardObservations;
  }

  getLongestDuration(observations: any[]){
    let observationDurations: number[] = observations.map(o => o.Timespan.Duration);
    return Math.max(...observationDurations);
  }
}