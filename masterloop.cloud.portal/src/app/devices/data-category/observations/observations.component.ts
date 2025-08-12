import {
  Component,
  OnInit,
  ViewChild,
  EventEmitter,
  Output,
} from '@angular/core';
import { DeviceService } from '../../../services/device.service';
import { LoggerService } from '../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import {
  ObservationOverflowDialog,
  Details,
} from './observation-dialog.component';
import {
  MatDialogRef,
  MatDialog,
  MatDialogConfig,
} from '@angular/material/dialog';
import { LocalStorageService } from '../../../services/local-storage.service';
import { LocalStorageKeys } from '../../../core/constants';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';
import { IndexedDbService, TemplateService } from 'src/app/services';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';
import { EnumerationGroupDetails, EnumerationItem } from 'src/app/core/interfaces/template-enumeration.interface';
import { NumberConstants } from 'src/app/core/constants/number.constants';

@Component({
  selector: 'app-observations',
  templateUrl: './observations.component.html',
  styleUrls: ['./observations.component.scss'],
})
export class ObservationsComponent implements OnInit {
  @ViewChild('deviceObservationListTable') table: any;

  MID: string;
  rows = [];
  columns = [];
  deviceObservations = [];
  generalObservations = [];
  detailedObservations = [];
  isMobile: boolean = false;
  expanded: any = {};
  isCompact: boolean = false;
  observationSearch = '';
  temp = [];

  dialogRef: MatDialogRef<ObservationOverflowDialog>;
  obsDetails: Details = null;
  lastCloseResult: string;
  config: MatDialogConfig = {
    disableClose: false,
    width: '80%',
    height: '80%',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
  };
  allSelected: boolean = false;

  //Checkbox
  selected = [];
  readonly: boolean = false;

  selectAllOnPage = [];
  pageOffset: any;
  companyListPaginated = [];
  deviceStatusColor;
  selectedView;

  quantities: QuantityItem[];
  observation: any;
  enumGroups: EnumerationGroupDetails[] = [];
  enumItems: EnumerationItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private deviceService: DeviceService,
    private loggerService: LoggerService,
    protected http: HttpClient,
    private router: Router,
    private cache: LocalStorageService,
    public dialog: MatDialog,
    protected indexedDbService: IndexedDbService,
    private templateService: TemplateService
  ) {
    this.MID = route.snapshot.params['id'];
    /**Handles url navigation on same url**/
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
    /**Mobile UI trigger */
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth < 768
    ) {
      this.isMobile = true;
      /**Handles url navigation on same url**/
      this.router.routeReuseStrategy.shouldReuseRoute = function () {
        return false;
      };
    }

    this.getTemplateUnits();
  }

  getTemplateUnits() {
    this.quantities = this.cache.getQuantities();
    if (!this.quantities) {
      this.templateService.getUnits().subscribe((data) => {
        this.quantities = data['Quantities'] as QuantityItem[];
        this.cache.setQuantities(this.quantities);
      });
    }
  }

  getDevice() {
    this.generalObservations = this.cache.getDeviceObservations(this.MID);
    this.enumGroups = this.cache.getDeviceEnumerations(this.MID);
  }

  toggleExpandRow(row) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  onDetailToggle(event) {}

  onResize() {
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth < 768
    ) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  searchObservations(event) {
    this.detailedObservations = this.temp;
    this.detailedObservations = this.detailedObservations.filter(
      (o) =>
        !this.observationSearch ||
        o.Name.toLowerCase().indexOf(this.observationSearch.toLowerCase()) >=
          0 ||
        (o.Timestamp !== undefined &&
          o.Timestamp.toLowerCase().indexOf(
            this.observationSearch.toLowerCase()
          ) >= 0) ||
        (o.Value !== undefined &&
          o.Value.toLowerCase().indexOf(this.observationSearch.toLowerCase()) >=
            0)
    );
  }

  clearObservationSearch() {
    this.observationSearch = '';
    this.detailedObservations = this.temp;
  }

  getDeviceStatusFromIndexedDb() {
    this.indexedDbService.getDevicesFromIndexedDb().subscribe((result) => {
      if (result.length > 0) {
        let allDevices = result[0].Value;
        let device = allDevices.filter((d) => d.MID == this.MID);
        if (device != null) {
          this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
            device[0].LatestPulse
          );
        }
      }
    });
  }

  ngOnInit() {
    //this.getDeviceStatusFromIndexedDb();
    let device = this.cache.getDevice(this.MID);
    let pulseTime = null;

    let devicePulse = this.deviceService
      .getDevicePulses(this.MID)
      .pipe(catchError((error) => of(error)));
    let deviceDetails = this.deviceService
      .getDeviceDetails(this.MID)
      .pipe(catchError((error) => of(error)));
    let deviceObsDetails = this.deviceService
      .getObservationDetails(this.MID)
      .pipe(catchError((error) => of(error)));
    if (device != null) {
      //get device details from session storage
      forkJoin([devicePulse, deviceObsDetails]).subscribe(
        (data) => {
          this.getDevice();
          this.deviceObservations = data[1].sort(function (a, b) {
            return parseFloat(a.Id) - parseFloat(b.Id);
          });
          this.generalObservations = device['Metadata']['Observations'].sort(
            function (a, b) {
              return parseFloat(a.Id) - parseFloat(b.Id);
            }
          );
          this.getDeviceObservationDetails();
          if (data[0] != null) {
            pulseTime = data[0].To;
          }
          this.handleDeviceColorCode(pulseTime);
        },
        (error) => {
          this.loggerService.showErrorMessage(error);
        }
      );
    } else {
      //get device details from apis

      forkJoin([deviceDetails, deviceObsDetails, devicePulse]).subscribe(
        (data) => {
          this.cache.updateDevice(data[0]);
          this.getDevice();
          this.generalObservations = data[0]['Metadata']['Observations'].sort(
            function (a, b) {
              return parseFloat(a.Id) - parseFloat(b.Id);
            }
          );
          this.deviceObservations = data[1].sort(function (a, b) {
            return parseFloat(a.Id) - parseFloat(b.Id);
          });
          this.getDeviceObservationDetails();
          if (data[2] != null) {
            pulseTime = data[2].To;
          }
          this.handleDeviceColorCode(pulseTime);
        },
        (error) => {
          this.loggerService.showErrorMessage(error);
        }
      );
    }
    this.setDeviceListView();
  }

  setDeviceListView() {
    let currentViewMode = this.getDeviceListModeFromLocal();
    if (currentViewMode != null) {
      this.selectedView = currentViewMode;
      if (currentViewMode == 'compact-tb') {
        this.isCompact = true;
      } else {
        this.isCompact = false;
      }
    } else {
      this.isCompact = false;
      this.selectedView = 'default-tb';
    }
  }

  onValChange(value) {
    this.updateDeviceListModeOnLocal(value);
    this.selectedView = value;
    if (value == 'compact-tb') {
      this.isCompact = true;
    } else {
      this.isCompact = false;
    }
  }

  updateDeviceListModeOnLocal(viewMode) {
    localStorage.setItem(
      LocalStorageKeys.DEVICE_LIST_VIEW_MODE,
      JSON.stringify(viewMode)
    );
  }

  getDeviceListModeFromLocal() {
    return JSON.parse(
      localStorage.getItem(LocalStorageKeys.DEVICE_LIST_VIEW_MODE)
    );
  }

  handleDeviceColorCode(pulseTime) {
    this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
      pulseTime,
      'UTC'
    );
  }

  getDeviceObservationDetails() {
    this.setAbbreviation();
    this.generalObservations.forEach((genObvElement) => {
      this.deviceObservations.forEach((devObvElement) => {
        if (genObvElement['Id'] == devObvElement['Id']) {
          let isEnumeration = false;

          let enumerationName: string = null;
          this.observation = this.generalObservations.find((x) => x.Id === genObvElement['Id']);
          if (this.observation.Quantity === NumberConstants.EnumerationGroupQuantityId) { // is Enumerations
            isEnumeration = true;
            enumerationName = this.enumGroups.find((x) => x.Id === this.observation.Unit)
              ?.Items.find(item => item.Id == devObvElement['Value']).Name;
          }

          let deviceObv = {
            Id: genObvElement['Id'],
            Name: genObvElement['Name'],
            UnitAbbreviation: isEnumeration ? enumerationName : genObvElement['UnitAbbreviation'],
            Description: genObvElement['Description'],
            DataType: devObvElement['DataType'],
            Timestamp: devObvElement['Timestamp'],
            Value: devObvElement['Value'],
            Selected: false,
            Readonly: this.readonly
          };

          //Replace observation obj with new obj
          var index = this.generalObservations.indexOf(genObvElement);
          if (index !== -1) {
            this.generalObservations[index] = deviceObv;
          }
        }
      });
    });
    this.detailedObservations = this.generalObservations;
    this.temp = [...this.detailedObservations];
  }

  setAbbreviation() {
    let unit = null;
    this.generalObservations.forEach((element) => {
      let quantity = this.quantities.find((x) => x.Id === element.Quantity);
      if (quantity.Units) {
        unit = quantity.Units.find((x) => x.Id === element.Unit);
      }

      if (unit) {
        element.UnitAbbreviation = unit.Abbreviation;
      }
    });
  }

  multipleObservations() {
    this.router.navigateByUrl(`/devices/${this.MID}/observations/live`);
  }

  open(observation: any) {
    this.dialogRef = this.dialog.open(ObservationOverflowDialog, this.config);

    this.obsDetails = {
      MID: this.MID,
      CurrentValue: observation.Value,
      ObservationName: observation.Name,
      Timestamp: observation.Timestamp,
    };

    this.dialogRef.componentInstance.details = this.obsDetails;

    this.dialogRef.afterClosed().subscribe((result) => {
      this.lastCloseResult = result;
      this.dialogRef = null;
      this.obsDetails = null;
    });
  }

  selectObservation(id) {
    let obs = this.detailedObservations.find((o) => o.Id == id);
    if (obs) {
      obs.Selected = !obs.Selected;
      this.selected.splice(id);
    }
    let selectedObs = this.detailedObservations.filter((o) => o.Selected);
    this.allSelected = selectedObs.length == this.detailedObservations.length;
    this.selected = selectedObs;
  }

  selectAll() {
    this.selected = [];
    this.allSelected = !this.allSelected;
    this.detailedObservations.forEach((obs, index) => {
      obs.Selected = this.allSelected;
    });
  }

  plotAll() {
    if (this.selected.length > 0 || this.allSelected) {
      if (this.allSelected) {
        this.router.navigate(['/devices/observations/' + this.MID + '/plots'], {
          queryParams: {
            filter: JSON.stringify('all'),
          },
        });
      } else {
        let observationIds = [];
        this.selected.forEach((obs) => {
          observationIds.push(obs.Id);
        });

        this.router.navigate(
          ['/devices/observations/' + this.MID + '/plots/'],
          {
            queryParams: {
              filter: JSON.stringify(observationIds),
            },
          }
        );
      }
    }
  }

  tableAll() {
    if (this.selected.length > 0 || this.allSelected) {
      if (this.allSelected) {
        this.router.navigate(['/devices/observations/' + this.MID + '/table'], {
          queryParams: {
            filter: JSON.stringify('all'),
          },
        });
      } else {
        let observationIds = [];
        this.selected.forEach((obs) => {
          observationIds.push(obs.Id);
        });
        this.router.navigate(
          ['/devices/observations/' + this.MID + '/table/'],
          {
            queryParams: {
              filter: JSON.stringify(observationIds),
            },
          }
        );
      }
    }
  }

  refreshDeviceDetails() {
    sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
  }
}
