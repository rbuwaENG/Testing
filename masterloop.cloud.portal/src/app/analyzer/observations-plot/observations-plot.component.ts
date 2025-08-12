import { Component, OnInit, ViewChild } from '@angular/core';
import { RangedAnalyzerComponent } from '../ranged-analyzer.component';
import { ObservationDataType } from '../../core/enums';
import { PlotComponent } from '../../shared/infographic/plot/plot.component';
import {
  AppSettings,
  ObservationService,
  LoggerService,
  LiveConnectionService,
  DeviceService,
} from '../../services';
import { LocalStorageService } from '../../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';

@Component({
  selector: 'app-observations-plot',
  templateUrl: './observations-plot.component.html',
  styleUrls: ['./observations-plot.component.scss'],
})
export class ObservationsPlotComponent
  extends RangedAnalyzerComponent
  implements OnInit
{
  @ViewChild(PlotComponent)
  protected infographicComponent: PlotComponent;
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
    this.observationDataTypeEnabledStatus[ObservationDataType.Position] = false;
  }

  ngOnInit() {
    this.infoGraphicOptions = this.infoGraphicOptions || {
      options: {
        chart: {
          zoomType: 'x',
        },
        series: {
          marker: {
            radius: 10,
          },
        },
      },
    };
    super.ngOnInit();
  }
  clearBuffer() {
    this.infographicComponent.clearSeries();
    this.redrawChart();
  }
  public clearObservationsValues(disconnectFromLive: boolean = false) {
    super.clearObservationsValues(disconnectFromLive);
    //this.infographicComponent.clearSeries();
  }
}
