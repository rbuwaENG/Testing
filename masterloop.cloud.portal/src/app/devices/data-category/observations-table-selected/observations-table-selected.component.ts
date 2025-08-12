import { Component, OnInit, ViewContainerRef, ViewChild } from '@angular/core';
import { BaseAnalyzerComponent } from '../base-analyzer.component';
import { ActivatedRoute } from '@angular/router';
import {
  DeviceService,
  LoggerService,
  ObservationService,
  DialogsService,
  LiveConnectionService,
  AppSettings,
  IndexedDbService,
} from '../../../services';
import { DeviceStruct, ObservationStruct } from '../../../core/models';
import { ObservationSelectedTableComponent } from './table/table.component';
import { ThemePalette } from '@angular/material/core';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';

@Component({
  selector: 'app-observations-table-selected',
  templateUrl: './observations-table-selected.component.html',
  styleUrls: ['./observations-table-selected.component.scss'],
})
export class ObservationsTableSelectedComponent
  extends BaseAnalyzerComponent
  implements OnInit
{
  @ViewChild(ObservationSelectedTableComponent)
  protected infographicComponent: ObservationSelectedTableComponent;

  mid: string;
  filter: string;
  public infoGraphicOptions: any;
  deviceStatusColor;

  constructor(
    private route: ActivatedRoute,
    appSettings: AppSettings,
    loggerService: LoggerService,
    deviceService: DeviceService,
    observationService: ObservationService,
    liveConnectionService: LiveConnectionService,
    protected dialogService: DialogsService,
    protected viewContainerRef: ViewContainerRef,
    protected indexedDbService: IndexedDbService
  ) {
    super(
      appSettings,
      loggerService,
      deviceService,
      observationService,
      liveConnectionService
    );

    this.mid = route.snapshot.params['id'];
    this.filter = this.route.snapshot.queryParams['filter'];
  }

  ngOnInit() {
    this.infoGraphicOptions = this.infoGraphicOptions || {};
    super.ngOnInit();
    this.setDeviceStatusColor();
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.mid).subscribe((data) => {
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

  ngAfterViewInit() {
    this.generateTable();
  }

  private generateTable() {
    if (this.filter) {
      let observations: any[] = [];
      let observationIds = JSON.parse(this.filter);
      if (observationIds != 'all') {
        this.deviceService.getDeviceDetails(this.mid).subscribe((data) => {
          observationIds.forEach((id) => {
            data['Metadata']['Observations'].forEach((observation) => {
              if (id == observation.Id) {
                observations.push({
                  Id: observation.Id,
                  Name: observation.Name,
                  DataType: observation.DataType,
                });
              }
            });
          });
          // observations = [...observations];
          this.generateColumns(observations);
        });
      } else {
        this.deviceService.getDeviceDetails(this.mid).subscribe((data) => {
          data['Metadata']['Observations'].forEach((observation) => {
            observations.push({
              Id: observation.Id,
              Name: observation.Name,
              DataType: observation.DataType,
            });
          });
          //observations = [...observations];
          this.generateColumns(observations);
        });
      }
    }
  }

  private generateColumns(observations: any[]) {
    let device = new DeviceStruct({ MID: this.mid });
    this.toggleDeviceSelection(device, false, true);
    for (let observation of observations) {
      let obs = new ObservationStruct(observation);
      this.toggleDeviceObservationSelection(device, obs, false, true);
    }
    this.onToggleChanged(2);
  }

  public clearObservationsValues(disconnectFromLive: boolean = false) {
    super.clearObservationsValues(disconnectFromLive);
    //this.infographicComponent.clearRows();
  }
  clearBuffer() {
    this.infographicComponent.clearRows();
  }
}
