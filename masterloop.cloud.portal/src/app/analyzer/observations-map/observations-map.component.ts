import {
  AppSettings,
  ObservationService,
  LoggerService,
  LiveConnectionService,
  DeviceService,
} from '../../services';
import { Component, OnInit, ViewChild } from '@angular/core';
import { RangedAnalyzerComponent } from '../ranged-analyzer.component';
import { ObservationDataType } from '../../core/enums';
import { MapComponent } from '../../shared/infographic/map/map.component';
import { LocalStorageService } from '../../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';

@Component({
  selector: 'app-observations-map',
  templateUrl: './observations-map.component.html',
  styleUrls: ['./observations-map.component.scss'],
})
export class ObservationsMapComponent
  extends RangedAnalyzerComponent
  implements OnInit
{
  @ViewChild(MapComponent)
  protected infographicComponent: MapComponent;
  public infoGraphicOptions: any;

  constructor(
    appSettings: AppSettings,
    loggerService: LoggerService,
    deviceService: DeviceService,
    observationService: ObservationService,
    liveConnectionService: LiveConnectionService,
    cache: LocalStorageService,
    dbService: NgxIndexedDBService
  ) {
    super(
      appSettings,
      loggerService,
      deviceService,
      observationService,
      liveConnectionService,
      cache,
      dbService
    );
    this.observationDataTypeEnabledStatus[ObservationDataType.String] = false;
    this.observationDataTypeEnabledStatus[ObservationDataType.Statistics] =
      false;
  }

  ngOnInit() {
    this.infoGraphicOptions = this.infoGraphicOptions || {};
    super.ngOnInit();
  }

  clearBuffer() {
    super.clearObservationsValues(false);
    this.infographicComponent.clearSources();
  }

  public clearObservationsValues(disconnectFromLive: boolean = false) {
    super.clearObservationsValues(disconnectFromLive);
    //this.infographicComponent.clearSources();
  }
}
