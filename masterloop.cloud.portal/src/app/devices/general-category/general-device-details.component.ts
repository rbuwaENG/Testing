import { Component, OnInit, ViewContainerRef } from '@angular/core';
import {
  DeviceService,
  DialogsService,
  LoggerService,
  IndexedDbService,
  SearchService
} from '../../services';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageKeys } from '../../core/constants';
import { LocalStorageService } from '../../services/local-storage.service';
import * as moment from 'moment';
import { DeviceDeleteComponent } from '../device-delete/device-delete.component';
import { MatDialog } from '@angular/material/dialog';
import { DeviceActivityColors } from 'src/app/core/constants/device-activity-colors';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MenuUpdateService } from 'src/app/services/menu-update.service';
import { AddOnFeaturesService } from 'src/app/services/add-on-features.service';
import { FeaturePopupComponent } from 'src/app/feature/feature-popup/feature-popup.component'
import { Tenant } from 'src/app/core/models/tenant';
import { TenantService } from 'src/app/services/tenant.service';
import { AddOnFeature } from 'src/app/core/enums/add-on-feature.enum';
import { SecurityPopupComponent } from '../security-category/security-popup/security-popup.component';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DeviceTemplate } from 'src/app/core/models';
import { DeviceListingComponent } from '../device-listing.component';

export interface DeviceDelete {
  MID: string;
}

@Component({
  providers: [DeviceListingComponent],
  moduleId: module.id,
  selector: 'app-general-device-details',
  templateUrl: './general-device-details.component.html',
  styleUrls: ['./general-device-details.component.scss'],
})
export class GeneralDeviceDetailsComponent implements OnInit {
  MID: string;
  deviceDetails = {};
  latestLogin;
  latestDevicePulse;
  latestLoginDate;
  latestDevicePulseDate;
  permissions = {
    canAdmin: false,
    canControl: false,
    canObserve: false,
  };
  isDeviceFavorite: boolean;
  deviceStatusColor = DeviceActivityColors.GRAY;
  isButtonVisible: boolean = false;
  TID;
  tenantList: Tenant[] = [];
  isDeviceEditCliked: boolean = false;
  isNewDeviceCreateMode: boolean = false;
  deviceForm: FormGroup;
  templates: DeviceTemplate[];
  btnName: string = 'Update';

  constructor(
    private addOnFeaturesService: AddOnFeaturesService,
    private deviceService: DeviceService,
    private route: ActivatedRoute,
    private loggerService: LoggerService,
    private dialogsService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private router: Router,
    private cache: LocalStorageService,
    private menuUpdateService: MenuUpdateService,
    public dialog: MatDialog,
    private indexedDBService: IndexedDbService,
    public searchService: SearchService,
    private tenantService: TenantService,
    private deviceList: DeviceListingComponent
  ) {
    this.MID = route.snapshot.params['id'];
    if (this.MID === undefined) {
      this.onCreateDevice();
    }
  }

  showFeatureNotAvailableDialog() {
    this.dialog.open(FeaturePopupComponent, {
      data: {
        addOnFeature: AddOnFeature.Dashboard
      },
    });
  }

  ngOnInit() {
    if (this.MID !== undefined) {
      this.getDevicePulses();
      this.checkDeviceIsFavorite();
      this.getTenantList();
      this.updateSideMenu();
    }
    this.loadTemplates();
  }

  async navigateToList() {
    var searchedText = (<HTMLInputElement>document.getElementById('search'))
      .value;
    let succeeded = await this.router.navigate(['devices', 'all']);
    if (succeeded) {
      if (searchedText != '') {
        this.searchService.getSearchedValue(searchedText);
      }
    }
  }

  navigateToDeviceDashboard() {
    if (this.deviceDetails['TemplateId'] != null) {
      if (!this.addOnFeaturesService.isFeatureEnabled(this.deviceDetails['TemplateId'], AddOnFeature.Dashboard, this.tenantList)) {
        this.showFeatureNotAvailableDialog();
        return;
      }
      let currentDashboard = JSON.parse(localStorage.getItem(this.deviceDetails['TemplateId']));
      if (currentDashboard != null) {
        let defaultDashboard = currentDashboard.filter(d => d.IsDefault == true)[0];
        this.router.navigateByUrl('devices/' + this.MID + '/dashboards/' + defaultDashboard.Id);
      } else {
        this.router.navigateByUrl('devices/' + this.MID + '/dashboards', { state: { TemplateId: this.deviceDetails['TemplateId'] } });
      }
    } else {
      this.loggerService.showErrorMessage("Unable to navigate to device dashboard.");
    }

  }

  getDeviceStatusFromIndexedDb() {
    this.indexedDBService.getDevicesFromIndexedDb().subscribe((result) => {
      console.log(result);
      if (result.length > 0) {
        let allDevices = result[0].Value;
        let deviceData = allDevices.filter((d) => d.MID == this.MID);
        console.log(deviceData);
        if (deviceData != null) {
          this.deviceStatusColor = this.getDeviceStatusColor(
            deviceData[0].LatestPulse
          );
        }
      }
    });
  }

  private updateSideMenu() {
    this.menuUpdateService.getMenuUpdatedValue(true);
  }

  private getDeviceStatusColor(pulseTime = null) {
    let color = DeviceActivityColors.GRAY;

    if (pulseTime != null) {
      var timeDiffMilliseconds =
        new Date().getTime() - new Date(pulseTime).getTime();

      var diffHours = Math.round(timeDiffMilliseconds / (1000 * 3600));
      var diffDays = Math.round(diffHours / 24);

      if (diffDays > 1) {
        color = DeviceActivityColors.RED;
      } else if (diffHours <= 2) {
        color = DeviceActivityColors.GREEN;
      } else if (diffHours > 2 && diffDays <= 1) {
        color = DeviceActivityColors.AMBER;
      } else {
        console.log(pulseTime);
      }
    }
    return color;
  }

  getBaseUrl() {
    // Needed on Angular 8+
    const parsedUrl = new URL(window.location.href);
    const baseUrl = parsedUrl.origin;
    //console.log(baseUrl);
    return baseUrl;
  }

  checkDeviceIsFavorite() {
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey = url + '-' + userName + 'favorite';
    let favoriteDevices = JSON.parse(localStorage.getItem(localStorageKey));
    if (favoriteDevices != null) {
      if (favoriteDevices.length > 0) {
        let device = favoriteDevices.filter((elem) => elem['MID'] == this.MID);
        if (device.length == 1) {
          this.isDeviceFavorite = true;
        } else {
          this.isDeviceFavorite = false;
        }
      }
    }
  }

  handleFavorite(MID, selection, tid) {
    if (!selection) {
      this.isDeviceFavorite = true;
    } else {
      this.isDeviceFavorite = false;
    }
    this.cache.handleFavoriteDevices(MID, !selection, tid);
    this.updateSideMenu();
  }

  getDevicePulses() {
    let devicePulse = this.deviceService
      .getDevicePulses(this.MID)
      .pipe(catchError((error) => of(error)));
    let deviceDetails = this.deviceService
      .getDeviceDetails(this.MID)
      .pipe(catchError((error) => of(error)));
    let devicePermission = this.deviceService
      .getDevicePermissionsSelf(this.MID)
      .pipe(catchError((error) => of(error)));
    forkJoin([devicePulse, deviceDetails, devicePermission]).subscribe(
      (data) => {
        if (data.length > 0) {
          if (data[0] != null) {
            this.latestDevicePulse = data[0]['To'];
          } else {
            this.latestDevicePulse = 'Never';
          }
          if (this.latestDevicePulse == null) {
            this.latestDevicePulseDate = 'Never';
          } else {
            if (this.latestDevicePulse != 'Never') {
              //Calulate the time difference in days
              var timeDiff =
                new Date().getTime() -
                new Date(this.latestDevicePulse).getTime();
              this.latestDevicePulseDate = this.formatTimeDuration(timeDiff);
            }
          }
          if (data[0] != null) {
            this.deviceStatusColor = this.getDeviceStatusColor(data[0]['To']);
          } else {
            this.deviceStatusColor = this.getDeviceStatusColor(null);
          }

          this.manageStatusOfDevice(data[1]);
          this.indexedDBService.updateDeviceCache(data[1], this.latestDevicePulse);
          this.cache.updateRecentDevices(this.MID, data[1].TemplateId);
          this.setDevicePermission(data[2]);
        }
      },
      (error) => {
        this.loggerService.showErrorMessage(
          'Getting latest device pulse details failed!'
        );
      }
    );
  }

  setDevicePermission(data) {
    this.permissions.canAdmin = data.CanAdmin;
    this.permissions.canControl = data.CanControl;
    this.permissions.canObserve = data.CanObserve;
  }

  manageStatusOfDevice(data) {
    if (this.latestDevicePulse != null) {
      if (this.latestDevicePulse != 'Never') {
        data['lastUpdatedTime'] = this.getDeviceStatusTime(
          this.latestDevicePulse
        );
      } else {
        data['lastUpdatedTime'] = 'Never';
      }
      data['status'] = this.getDeviceStatus();
    } else {
      data['lastUpdatedTime'] = this.latestDevicePulseDate;
      data['status'] = this.getDeviceStatus();
    }

    this.formatTimeValues(data);
  }

  formatTimeValues(data) {
    if (data['CreatedOn'] != null) {
      data['CreatedOn'] =
        moment(data['CreatedOn']).utc().format('YYYY-MM-DD h:mm:ss') + ' UTC';
    }
    if (data['UpdatedOn'] != null) {
      data['UpdatedOn'] =
        moment(data['UpdatedOn']).utc().format('YYYY-MM-DD h:mm:ss') + ' UTC';
    }
    if (this.latestDevicePulse != null) {
      if (this.latestDevicePulse != 'Never') {
        this.latestDevicePulse =
          moment(this.latestDevicePulse).utc().format('YYYY-MM-DD HH:mm:ss') +
          ' UTC';
      }
    }

    this.deviceDetails = data;
  }

  getDeviceStatusTime(latestPulse) {
    let statusAgo = 'never';
    if (latestPulse != null) {
      statusAgo = moment(latestPulse).fromNow();
      return statusAgo;
    }
    return statusAgo;
  }

  getTenantList() {
    this.tenantService.getTenants().subscribe((tenants) => {
      this.tenantList = tenants?.map(t => new Tenant(t["Id"], t["Name"], t["Features"], t["TemplateIds"]));
    });
  }

  getDeviceStatus() {
    let status = 'Offline';
    if (this.latestDevicePulse != null) {
      var timeDiffMilliseconds =
        new Date().getTime() - new Date(this.latestDevicePulse).getTime();

      var diffHours = Math.round(timeDiffMilliseconds / (1000 * 3600));
      var diffDays = Math.round(diffHours / 24);

      if (diffDays > 1) {
        status = 'Offline';
      } else if (diffHours <= 2) {
        status = 'Online';
      } else if (diffHours > 2 && diffDays <= 1) {
        status = 'Offline';
      } else {
        //console.log(this.latestDevicePulse);
      }
    }
    return status;
  }

  getDeviceActivities() {
    this.deviceService.getDeviceActivities(this.MID).subscribe(
      (data) => {
        this.latestLogin = data;

        if (this.latestLogin == '') {
          this.latestLoginDate = 'Never';
        } else {
          //Calulate the time difference in days
          var timeDiff =
            new Date().getTime() - new Date(this.latestLogin).getTime();
          this.latestLoginDate = this.formatTimeDuration(timeDiff);
        }
      },
      (error) => {
        this.loggerService.showErrorMessage(
          'Getting latest login details failed!'
        );
      }
    );
  }

  deleteDevice(MID) {
    const dialogRef = this.dialog.open(DeviceDeleteComponent, {
      width: '250px',
      data: { MID: MID },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result == 'success') {
        this.loggerService.showSuccessfulMessage(
          'Device deleted successfully.'
        );
        this.router.navigateByUrl('devices/all');
      } else if (result == 'fail') {
        this.loggerService.showErrorMessage(
          'Opps.Something went wrong while deleting the device. Please try again in a few moment.'
        );
      }
    });
  }

  deleteDeviceOld(MID) {
    this.dialogsService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete?',
        true,
        this.viewContainerRef
      )
      .subscribe((res) => {
        if (res == true) {
          this.deviceService.deleteDevice(MID).subscribe(
            (response) => {
              //remove cached device by mid
              this.cache.removeSessionStorageDeviceByMid(this.MID);
              this.cache.removeLocalStorageDeviceByMid(this.MID);
              this.loggerService.showSuccessfulMessage(
                'Device successfully deleted!'
              );
              this.router.navigateByUrl('devices/all');
            },
            (error) => {
              this.loggerService.showSuccessfulMessage('Device delete failed!');
            }
          );
        }
      });
  }

  getDevicePermission() {
    this.deviceService.getDevicePermissionsSelf(this.MID).subscribe(
      (data) => {
        this.permissions.canAdmin = data.CanAdmin;
        this.permissions.canControl = data.CanControl;
        this.permissions.canObserve = data.CanObserve;
      },
      (error) => {
        this.loggerService.showErrorMessage(
          'Getting device permissions failed!'
        );
      }
    );
  }

  formatTimeDuration(ts) {
    var diffDays = Math.abs(Math.round(ts / (1000 * 3600 * 24)));
    var diffHours = Math.abs(Math.round(ts / (1000 * 3600)));
    var diffMinutes = Math.abs(Math.round(ts / (1000 * 60)));
    var diffSeconds = Math.abs(Math.round(ts / 1000));

    if (diffDays > 1) {
      return ' (' + diffDays + ' days ago)';
    } else if (diffHours > 1) {
      if (diffHours >= 24 && diffDays == 1) {
        return ' (' + diffDays + ' day ago)';
      } else {
        return ' (' + diffHours + ' hours ago)';
      }
    } else if (diffMinutes > 1) {
      if (diffMinutes >= 60 && diffHours == 1) {
        return ' (' + diffHours + ' hour ago)';
      } else {
        return ' (' + diffMinutes + ' minutes ago)';
      }
    } else {
      if (diffSeconds >= 60 && diffMinutes == 1) {
        return ' (' + diffMinutes + ' minute ago)';
      } else {
        return ' (' + diffSeconds + ' seconds ago)';
      }
    }
  }

  refreshDeviceDetails() {
    sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
  }

  getTenantName(templateId: string): string {
    let selectedTenant = this.tenantList?.find(tenant => tenant.templateIds?.includes(templateId));
    return selectedTenant?.name;
  }

  navigateToTenant(templateId: string) {
    let selectedTenant = this.tenantList?.find(tenant => tenant.templateIds?.includes(templateId));
    this.router.navigateByUrl(`tenants/${selectedTenant?.id}/details`);
  }

  openSecurityPopupClick() {
    this.dialog.open(SecurityPopupComponent, {
      width: "550px",
      maxWidth: "550px",
      data: { MID: this.MID }
    });
  }

  loadTemplates() {
    let tempTemplateValues = [];
    this.deviceService.getTemplates().subscribe( //get all template details
      dataTemplates => {

        if (dataTemplates === null) {
          this.loggerService.showErrorMessage('No templates available!');
          this.router.navigateByUrl('devices/all');
        }
 
        tempTemplateValues = dataTemplates;
        tempTemplateValues = tempTemplateValues.sort((a, b) => {
          if (a.Name < b.Name) return -1;
          else if (a.Name > b.Name) return 1;
          else return 0;
        });
        this.templates = tempTemplateValues;
      },
      error => {
        this.loggerService.showErrorMessage('Getting templates failed!');
      }
    );
  }

  onCreateDevice() {
    this.btnName = 'Create';
    this.buildForm(true); // create form
    this.deviceService.getUniqueMID().subscribe(
      dataMID => {
        this.deviceForm.patchValue({
          MID: dataMID.replace(/['"]+/g, ''),
          Name: 'My Device',
          PSK: this.getRandomString(7, 17)
        });
      },
      error => {
        this.loggerService.showErrorMessage('Getting unique MID failed!');
      }
    );
    this.isNewDeviceCreateMode = true;
  }

  onEditDeviceDetails() {
    this.buildForm(); // create form
    this.deviceForm.patchValue({
      TemplateId: this.deviceDetails['TemplateId'],
      MID: this.deviceDetails['MID'],
      Name: this.deviceDetails['Name'],
      Description: this.deviceDetails['Description']
    });
    this.isDeviceEditCliked = !this.isDeviceEditCliked; //display form
  }

  private buildForm(isCreateMode: boolean = false) {
    const commonFormControls = this.buildCommonFormControls();
    this.deviceForm = new FormGroup(commonFormControls);

    if (isCreateMode) {
      this.deviceForm.addControl('PSK', new FormControl(null, [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(16)
      ]));
    }
  }

  private buildCommonFormControls() {
    return {
      TemplateId: new FormControl(null, [
        Validators.required
      ]),
      MID: new FormControl(null, [
        Validators.required
      ]),
      Name: new FormControl(null, [
        Validators.required
      ]),
      Description: new FormControl(null, [
        Validators.required
      ])
    };
  }

  getRandomString(min: number, max: number) {
    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = min; i < max; i++) {
      result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
  }

  onSubmit() {
    if (this.deviceForm.valid) {
      let updatedDeviceDetails = Object.assign(this.deviceDetails, this.deviceForm.value);
      if (!this.isNewDeviceCreateMode) {
        //Update device
        this.deviceService.updateDevice(updatedDeviceDetails).subscribe(
          response => {
            //remove cached device by mid
            this.isDeviceEditCliked = !this.isDeviceEditCliked;
            this.cache.removeSessionStorageDeviceByMid(this.MID);
            this.loggerService.showSuccessfulMessage(
              'Device successfully updated!'
            );
            this.deviceList.refreshDeviceList();
            this.ngOnInit();
          },
          error => {
            this.loggerService.showErrorMessage('Device updating failed!');
          }
        );
      } else {
        //Create device
        this.deviceService.createDevice(updatedDeviceDetails).subscribe(
          response => {
            this.loggerService.showSuccessfulMessage(
              'Device successfully added!'
            );
            this.deviceList.refreshDeviceList();
            this.router.navigateByUrl('devices/general/' + updatedDeviceDetails['MID']);
          },
          error => {
            this.loggerService.showErrorMessage('Device adding failed!');
          }
        );
      }
    }
  }

  onCancel() {
    if (this.MID !== undefined) {
      this.deviceForm.reset();
      this.isDeviceEditCliked = !this.isDeviceEditCliked;
    } else {
      this.router.navigateByUrl('devices/all');
    }
  }
}
