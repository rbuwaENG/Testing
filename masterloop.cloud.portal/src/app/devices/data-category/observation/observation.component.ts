import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { DateRangedTabbedTableComponent } from '../../../common/date-ranged-tabbed-table.component';
import { LiveSubscriber, LiveConnectRequest } from '../../../core/models';
import {
  AppSettings,
  LoggerService,
  LiveConnectionService,
  LiveUpdateService,
  ObservationService,
  IndexedDbService,
  TemplateService
} from '../../../services';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';
import { EnumerationGroupDetails, EnumerationItem } from 'src/app/core/interfaces/template-enumeration.interface';
import { NumberConstants } from '../../../core/constants/number.constants';

export class ObservationComponent extends DateRangedTabbedTableComponent {
  deviceId: any;
  observationId: any;
  observationName: any;
  dataType: any;
  deviceStatusColor;
  abbrieviation: string;

  generalObservations = [];
  quantities: QuantityItem[];
  enumGroups: EnumerationGroupDetails[] = [];
  enumItems: EnumerationItem[] = [];
  observation: any;
  
  constructor(
    appSettings: AppSettings,
    loggerService: LoggerService,
    liveConnectionService: LiveConnectionService,
    protected route: ActivatedRoute,
    protected observationService: ObservationService,
    protected indexedDbService: IndexedDbService,
    protected cache: LocalStorageService,
    protected templateService: TemplateService
  ) {
    super(appSettings, loggerService, liveConnectionService);
    this.deviceId = route.snapshot.params['deviceId'];
    this.observationId = route.snapshot.params['observationId'];
    this.observationName = route.snapshot.params['observationName'] || '';
    this.dataType = +(route.snapshot.params['dataType'] || '');
    this.setDeviceStatusColor();
    this.getDevice();
    this.getTemplateUnits();
    this.getAbbreviation(+(this.observationId || ''));
  }

  getDevice() {
    this.generalObservations = this.cache.getDeviceObservations(this.deviceId);
    this.enumGroups = this.cache.getDeviceEnumerations(this.deviceId);
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

  getAbbreviation(id: number) {
    this.observation = this.generalObservations.find((x) => x.Id === id);

    let quantity = this.quantities.find((x) => x.Id === this.observation.Quantity);
    if (quantity.Units) {
      this.abbrieviation = quantity.Units.find((x) => x.Id === this.observation.Unit).Abbreviation;
    }
    if (this.observation.Quantity === NumberConstants.EnumerationGroupQuantityId) { // is Enumerations
      let enumGroup =this.enumGroups.find((x) => x.Id === this.observation.Unit);
      this.abbrieviation = enumGroup.Name;
      this.enumItems = enumGroup.Items;
    }
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.observationService.getPulse(this.deviceId).subscribe((data) => {
      if (data != null) {
        pulseTime = data.To;
      }
      this.handleDeviceColorCode(pulseTime);
    });
  }

  handleDeviceColorCode(pulseTime) {
    this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
      pulseTime,
      'UTC'
    );
  }

  getDeviceStatusFromIndexedDb() {
    this.indexedDbService.getDevicesFromIndexedDb().subscribe((result) => {
      if (result.length > 0) {
        let allDevices = result[0].Value;
        let device = allDevices.filter((d) => d.MID == this.deviceId);
        if (device != null) {
          this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
            device[0].LatestPulse
          );
        }
      }
    });
  }

  protected parseSocketMessageToData(targetTab: any, message: any): any {
    var splits = null;
    if (
      !(splits = message.headers.destination.split('/')).length ||
      (splits = splits[splits.length - 1].split('.')).length < 3 ||
      splits[0] != this.deviceId ||
      splits[splits.length - 1] != this.observationId
    ) {
      return null;
    }
    return message.body;
  }

  protected getLiveConnectionRequestOptions(): LiveConnectRequest[] {
    return [
      Object.assign(new LiveConnectRequest(), {
        MID: this.deviceId,
        ObservationIds: [Number(this.observationId)],
        InitObservationValues: true,
      }),
    ];
  }
  protected loadValues(): Observable<any> {
    return this.observationService.getObservationValues(
      this.deviceId,
      this.observationId,
      this.selectedTab.from.toDate(),
      this.selectedTab.to.toDate(),
      this.selectedTab.name
    );
    // return this.observationService.getObservationValues(this.deviceId, this.observationId, this.selectedTab.from.toDate(), this.selectedTab.to.toDate());
  }

  protected onDataReceivedError(error: any): void {
    //this.loggerService.showErrorMessage("Error, While loading Observation values !!");
  }
}
