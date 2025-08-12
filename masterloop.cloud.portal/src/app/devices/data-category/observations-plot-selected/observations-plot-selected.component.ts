import { Component, OnInit, ViewChild } from '@angular/core';
import { SelectedObservationsService } from '../../../services/selected-observations.service';
import { RangedAnalyzerComponent } from '../../../analyzer/ranged-analyzer.component';
import {
  AppSettings,
  LoggerService,
  DeviceService,
  ObservationService,
  LiveConnectionService,
  IndexedDbService,
  SiteSetting,
} from '../../../services';
import { PlotComponent } from '../../../shared/infographic/plot/plot.component';
import { ObservationDataType } from '../../../core/enums';
import {
  ObservationStruct,
  DateRangedEntity,
  WebSocketSubscriber,
  LiveConnectRequest,
} from '../../../core/models';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { ObservationComponent } from '../observation/observation.component';
import { DateExtension } from '../../../core/extensions';
import { forkJoin, Observable, of } from 'rxjs';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';
import { catchError, startWith } from 'rxjs/operators';
import Highcharts from 'highcharts';
import { darkTheme, lightTheme } from 'src/assets/highcharts/highchartsthemes';
import { ThemeStyles } from 'src/app/core/constants/theme-styles-constants';

@Component({
  selector: 'app-observations-plot-selected',
  templateUrl: './observations-plot-selected.component.html',
  styleUrls: ['./observations-plot-selected.component.scss'],
})
export class ObservationsPlotSelectedComponent {
  isLoading = false;
  deviceMID;
  public tabs: any[];
  public webSocketSubscriber: WebSocketSubscriber;
  observationValues = [];
  selectedObservationsIds = [];
  selectedObservations = [];
  generatedCharts = [];
  cardMd: string;
  cardXs: string;
  plotCssClass: string;
  testObs = [];
  deviceStatusColor;

  public selectedTabIndex: any;
  public get selectedTab(): any {
    return this.selectedTabIndex != null &&
      this.selectedTabIndex >= 0 &&
      this.selectedTabIndex < this.tabs.length
      ? this.tabs[this.selectedTabIndex]
      : null;
  }

  constructor(
    protected appSettings: AppSettings,
    protected loggerService: LoggerService,
    protected deviceService: DeviceService,
    protected observationService: ObservationService,
    protected liveConnectionService: LiveConnectionService,
    private route: ActivatedRoute,
    protected indexedDbService: IndexedDbService,
    private siteSettings: SiteSetting
  ) {
    this.deviceMID = route.snapshot.params['id'];
    this.tabs = [
      Object.assign(new DateRangedEntity(), {
        name: 'Live Log',
        duration: 0,
        isLive: true,
        showDateRangeSelector: false,
        showClearBuffer: true,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Minute',
        duration: moment.duration(1, 'minutes'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Hour',
        duration: moment.duration(1, 'hours'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Day',
        duration: moment.duration(1, 'days'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Week',
        duration: moment.duration(1, 'weeks'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Month',
        duration: moment.duration(1, 'months'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'User Defined',
        showDateRangeSelector: true,
        values: [],
      }),
    ];
    this.webSocketSubscriber = new WebSocketSubscriber(
      this.appSettings,
      this.liveConnectionService
    );
  }

  ngOnInit() {
    this.siteSettings.themeType.valueChanges
    .pipe(startWith(this.siteSettings.themeType.getValue()))  
    .subscribe((theme) => {
      this.tabs.forEach((m) => {
        m.options = this._getChartOptions();
        m.charts = [];
      });
      let pulseTime = null;
      let devicePulse = this.deviceService
        .getDevicePulses(this.deviceMID)
        .pipe(catchError((error) => of(error)));
      let deviceDetails = this.deviceService
        .getDeviceDetails(this.deviceMID)
        .pipe(catchError((error) => of(error)));
  
      this.selectedObservationsIds = [];
      this.selectedObservations = [];
      this.route.queryParams.subscribe((p: any) => {
        if (p.filter) {
          let param = JSON.parse(p.filter);
          if (param != 'all') {
            forkJoin([deviceDetails, devicePulse]).subscribe((data) => {
              this.selectedObservationsIds = JSON.parse(p.filter);
              this.selectedObservationsIds.forEach((id) => {
                data[0]['Metadata']['Observations'].forEach((observation) => {
                  if (id == observation.Id) {
                    if (
                      Number(observation.DataType) !== 5 &&
                      Number(observation.DataType) !== 6
                    ) {
                      let obsName = [];
                      obsName['Id'] = observation.Id;
                      obsName['Name'] = observation.Name;
                      this.selectedObservations.push(obsName);
                    }
                  }
                });
              });
              this.onTabSelectedChanged(this.selectedTabIndex);
              this.setPlotViewCardStyles();
              if (data[1] != null) {
                pulseTime = data[1].To;
              }
              this.handleDeviceColorCode(pulseTime);
            });
          } else {
            forkJoin([deviceDetails, devicePulse]).subscribe((data) => {
              data[0]['Metadata']['Observations'].forEach((observation) => {
                if (
                  Number(observation.DataType) !== 5 &&
                  Number(observation.DataType) !== 6
                ) {
                  let obsName = [];
                  obsName['Id'] = observation.Id;
                  obsName['Name'] = observation.Name;
                  this.selectedObservations.push(obsName);
                }
              });
              this.onTabSelectedChanged(this.selectedTabIndex);
              this.setPlotViewCardStyles();
              if (data[1] != null) {
                pulseTime = data[1].To;
              }
              this.handleDeviceColorCode(pulseTime);
            });
          }
        }
      });
      Highcharts.setOptions((ThemeStyles.darkMode === theme) ? darkTheme : lightTheme);
    });
    this.onTabSelectedChanged(2);
  }

  handleDeviceColorCode(pulseTime) {
    this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
      pulseTime,
      'UTC'
    );
  }

  public onTabSelectedChanged(selectedToggleIndex?: number) {
    this.safeDisconnect();
    this.selectedTabIndex =
      typeof selectedToggleIndex === typeof undefined
        ? this.selectedTabIndex
        : selectedToggleIndex;
    this.selectedTab.to =
      (this.selectedTab.duration ||
      !this.selectedTab.to ||
      !this.selectedTab.to.isValid()
        ? null
        : this.selectedTab.to) || moment.utc();
    this.selectedTab.from =
      !this.selectedTab.duration &&
      this.selectedTab.from &&
      this.selectedTab.from.isValid()
        ? this.selectedTab.from
        : this.selectedTab.to
            .clone()
            .subtract(
              this.selectedTab.duration || moment.duration(1, 'minutes')
            );
    this.fetchValuesForSelectedTab();
  }

  protected fetchValuesForSelectedTab(): void {
    this.onPreDataFetch(this.selectedTab);

    /* validations */
    if (!this.selectedTab.from || !this.selectedTab.to) {
      return this.loggerService.showErrorMessage('Please enter valid dates!');
    }
    if (this.selectedTab.from > this.selectedTab.to) {
      return this.loggerService.showErrorMessage(
        'To date must be greater than from!'
      );
    }
    if (
      moment
        .duration(this.selectedTab.to.diff(this.selectedTab.from))
        .asDays() > 60
    ) {
      return this.loggerService.showErrorMessage(
        'Selected date range must be less than 60!'
      );
    }

    if (!this.selectedTab.isLive) {
      this.loadValues();
      return;
    }
    this.loadValuesViaSocket();
  }

  protected loadValues() {
    this.selectedObservations.sort(function (a, b) {
      if (a.Name < b.Name) {
        return -1;
      }
      if (a.Name > b.Name) {
        return 1;
      }
      return 0;
    });
    this.selectedObservations.forEach((observation) => {
      this.observationService
        .getObservationValues(
          this.deviceMID,
          observation.Id,
          this.selectedTab.from.toDate(),
          this.selectedTab.to.toDate(),
          this.selectedTab.name
        )
        .subscribe((data) => {
          data.observationName = observation.Name;
          this.onDataReceivedSuccess(this.selectedTab, data, observation.Id);
        });
    });
  }

  protected mainOnDataReceived(targetTab: any, data: any | any[]): void {
    data = (data = data || []) instanceof Array ? data : [data];
    if (!targetTab.isLive) {
      targetTab.values.splice(0, targetTab.values.length);
    }
    targetTab.values.push(...data);
  }

  protected onDataReceivedSuccess(
    targetTab: any,
    data: any | any[],
    observationId: any
  ): void {
    targetTab.chart = targetTab.charts.find((x) => x.id === observationId);
    var observationName = data.observationName;
    this.mainOnDataReceived(targetTab, (data = data || []));
    data = (data instanceof Array ? data : [data]).map((elem) => [
      DateExtension.getTimestampAsMilliseconds(elem.Timestamp),
      Number(elem.Value),
    ]);
    var series = targetTab.chart.chart.series[0];
    if (!targetTab.isLive) {
      series.name = observationName;
      series.setData(data, true);
    } else if (data.length > 10) {
      data.forEach((m) => series.addPoint(m, false));
      targetTab.chart.chart.redraw();
    } else {
      targetTab.chart.chart.reflow();
      data.forEach((m) => series.addPoint(m));
    }
    targetTab.chart.chart.reflow();
  }

  public saveChart(targetTab: any, chart: any, obsId: any) {
    let data = {
      id: obsId,
      chart: chart,
    };
    targetTab.charts.push(data);
  }

  protected loadValuesViaSocket() {
    this.safeDisconnect();
    var selectedTab = this.selectedTab;
    this.webSocketSubscriber
      .connect(this.getLiveConnectionRequestOptions())
      .then(
        () =>
          this.webSocketSubscriber.messageStream.subscribe((message) =>
            this.parseSocketMessageToData(selectedTab, message)
          ),
        (error: any) => this.onDataReceivedError(selectedTab, error)
      );
  }

  protected parseSocketMessageToData(targetTab: any, message: any): any {
    var splits = null;
    this.selectedObservations.forEach((observation) => {
      if (
        !(splits = message.headers.destination.split('/')).length ||
        (splits = splits[splits.length - 1].split('.')).length < 3 ||
        splits[0] != this.deviceMID ||
        splits[splits.length - 1] != observation.Id
      ) {
        return null;
      }
      this.onDataReceivedSuccess(targetTab, message.body, observation.Id);
    });
  }

  protected getLiveConnectionRequestOptions(): LiveConnectRequest[] {
    return [
      Object.assign(new LiveConnectRequest(), {
        MID: this.deviceMID,
        ObservationIds: this.selectedObservationsIds,
        InitObservationValues: true,
      }),
    ];
  }

  /** Safe disconnect from any existing socket.. */
  protected safeDisconnect(): void {
    if (
      this.webSocketSubscriber.isConnected &&
      (!this.selectedTab || (this.selectedTab && !this.selectedTab.isLive))
    ) {
      this.webSocketSubscriber.disconnect();
      this.onPreDataFetch(this.selectedTab);
    }
  }
  protected mainOnPreDataFetch(targetTab: any): void {
    targetTab.values.splice(0, targetTab.values.length);
  }
  protected onPreDataFetch(targetTab: any): void {
    this.mainOnPreDataFetch(targetTab);
    targetTab.charts.forEach((chart) => {
      chart.chart.series[0].setData([], true);
      if (this.selectedTab.isLive) {
        chart.chart.reflow();
      }
    });
    // if (targetTab.chart && targetTab.chart.series[0]) {
    //     targetTab.chart.series[0].setData([], true);
    // }
  }

  protected onDataReceivedError(targetTab: any, error: any): void {
    this.loggerService.showErrorMessage(error);
  }
  public ngOnDestroy(): void {
    this.webSocketSubscriber.disconnect();
  }

  private _getChartOptions(data: any[] = []): any {
    return {
      title: { text: ' ' },
      chart: {
        zoomType: 'x',
        // width: 325,
      },
      series: [
        {
          data: data,
          lineWidth: 1,
          fillOpacity: 0.5,
          marker: {
            fillColor: '#007dbd',
            lineColor: '#007dbd',
            radius: 3,
            fillOpacity: 0.5,
          },
        },
      ],
      line: {
        color: '#007dbd',
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Timestamp in UTC',
        },
      },
      yAxis: {
        title: {
          text: '',
        },
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        crosshairs: true,
        shared: true,
      },
    };
  }

  private setPlotViewCardStyles(): void {
    if (this.selectedObservations.length === 1) {
      this.cardMd = '100%';
      this.cardXs = '100%';
      this.plotCssClass = 'plot';
    } else if (this.selectedObservations.length === 2) {
      this.cardMd = '50%';
      this.cardXs = '50%';
      this.plotCssClass = 'plot';
    } else {
      this.cardMd = '50%';
      this.cardXs = '50%';
      this.plotCssClass = 'plot-all';
    }
  }
}
