import * as moment from 'moment';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
// import { DateRangedTabbedTableComponent } from '../../../common/date-ranged-tabbed-table.component';
import {
  LoggerService,
  PulseService,
  DeviceService,
  IndexedDbService,
  SiteSetting,
} from '../../../services';
import { LocalStorageService } from '../../../services/local-storage.service';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';
import Highcharts from 'highcharts';
import { darkTheme, lightTheme } from 'src/assets/highcharts/highchartsthemes';
import { ThemeStyles } from 'src/app/core/constants/theme-styles-constants';
import { startWith } from 'rxjs/operators';

@Component({
  template: '',
})
export abstract class PulseComponent implements OnInit {
  customDateSelected: any;
  chart: any;
  customTo: any;
  customFrom: any;
  deviceId: any;
  pulseId: any;
  observationName: any;
  from: moment.Moment;
  to: moment.Moment;
  tabs: any[];
  pulseValues: any[];
  selectedTabIndex: any;
  chartBool: any;
  activePulses = [];
  chartSeries = [];
  names = [];
  allPulses = [];
  protected get selectedTab(): any {
    return this.selectedTabIndex != null &&
      this.selectedTabIndex >= 0 &&
      this.selectedTabIndex < this.tabs.length
      ? this.tabs[this.selectedTabIndex]
      : null;
  }
  deviceStatusColor;

  constructor(
    protected route: ActivatedRoute,
    protected loggerService: LoggerService,
    protected pulseService: PulseService,
    protected cache: LocalStorageService,
    protected deviceService: DeviceService,
    protected indexedDbService: IndexedDbService,
    private siteSettings: SiteSetting
  ) {
    this.deviceId = route.snapshot.params['deviceId'];
    this.selectedTabIndex = 1;

    this.tabs = [
      {
        label: 'Last Minute',
        duration: moment.duration(1, 'minutes'),
        live: false,
      },
      {
        label: 'Last Hour',
        duration: moment.duration(1, 'hours'),
        live: false,
      },
      { label: 'Last Day', duration: moment.duration(1, 'days'), live: false },
      {
        label: 'Last Week',
        duration: moment.duration(1, 'weeks'),
        live: false,
      },
      {
        label: 'Last Month',
        duration: moment.duration(1, 'months'),
        live: false,
      },
      { label: 'User Defined' },
    ];
  }

  protected loadPulseValues(
    deviceId: any,
    pulseId: any,
    from: moment.Moment,
    to: moment.Moment
  ): Observable<any> {
    return this.pulseService.getPulseValues(
      deviceId,
      pulseId,
      from.toDate(),
      to.toDate(),
      this.selectedTab.label
    );
  }

  public onTabSelectedChanged(): void {
    this.resetChartValues();
    if (!this.selectedTab) {
      return;
    }
    this.selectedTabIndex == 5
      ? (this.customDateSelected = true)
      : (this.customDateSelected = false);
    this.onPreDataFetch();

    if (!this.customDateSelected) {
      this.to = moment();
      this.from = moment(this.to).subtract(this.selectedTab.duration);
    } else {
      this.to = moment();
      this.from = this.to;
    }
    this.getAllPulseIdsAndValues(this.deviceId);
  }

  protected abstract onPreDataFetch(): void;
  protected abstract onDataReceivedSuccess(data: any): void;

  protected onDataReceivedError(error: any): void {
    this.loggerService.showErrorMessage('Error, While loading pulse values!');
  }

  public ngOnInit(): void {
    this.siteSettings.themeType.valueChanges
    .pipe(startWith(this.siteSettings.themeType.getValue()))  
    .subscribe((theme) => {
      this.onTabSelectedChanged();
      this.setDeviceStatusColor();
      let currentTheme = (ThemeStyles.darkMode === theme) ? darkTheme : lightTheme;
      if (this.chart)
          this.chart.update(currentTheme);
      Highcharts.setOptions(currentTheme);
  });
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.deviceId).subscribe((data) => {
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

  protected searchHistory() {
    console.log(this.selectedTab);
    this.resetChartValues();
    // if (!this.customFrom || !this.customTo) {
    //   //this.loggerService.showErrorMessage("Please enter valid dates!");
    //   return;
    // }
    this.from = moment.parseZone(this.selectedTab._from.toString());
    this.to = moment.parseZone(this.selectedTab._to.toString());
    if (this.from && this.to) {
      if (moment.duration(this.to.diff(this.from)).asDays() < 61) {
        if (this.to.diff(this.from) > 0) {
          this.onPreDataFetch();
          this.getAllPulseIdsAndValues(this.deviceId);
        } else {
          this.loggerService.showErrorMessage(
            'To date must be greater than from!'
          );
        }
      } else {
        this.loggerService.showErrorMessage(
          'Selected date range must be less than 60!'
        );
      }
    } else {
      this.loggerService.showErrorMessage('Please enter valid dates!');
    }
  }

  saveChart(chart) {
    this.chart = chart;
  }

  getAllPulseIdsAndValues(deviceId: any) {
    // get pulse ids from session storage or update session storage
    let device = this.cache.getDevice(deviceId);
    if (device != null) {
      this.getPulseValues(device.Metadata.Pulses);
    } else {
      this.deviceService.getDeviceDetails(deviceId).subscribe(
        (data) => {
          this.cache.updateDevice(data);
          this.getPulseValues(data.Metadata.Pulses);
        },
        (error) => {
          this.loggerService.showErrorMessage('Getting device details failed!');
        }
      );
    }
  }

  getPulseValues(pulses: any) {
    let pulseResponse = {
      Data: null,
      PulseId: null,
      PulseName: null,
    };
    this.chartSeries = [];
    pulses.forEach((pulse) => {
      this.loadPulseValues(
        this.deviceId,
        pulse.Id,
        this.from,
        this.to
      ).subscribe(
        (data) => {
          pulseResponse.Data = data;
          pulseResponse.PulseName = pulse.Name;
          pulseResponse.PulseId = pulse.Id;
          this.onDataReceivedSuccess(pulseResponse);
        },
        (error) => this.onDataReceivedError(error)
      );
    });
  }

  resetChartValues() {
    this.activePulses = [];
    this.chartSeries = [];
    this.names = [];
    this.allPulses = [];
  }
}
