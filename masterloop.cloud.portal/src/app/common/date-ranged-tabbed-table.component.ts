import * as moment from 'moment';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';

import {
  LiveConnectRequest,
  WebSocketSubscriber,
  DateRangedEntity,
} from '../core/models';
import { AppSettings, LoggerService, LiveConnectionService } from '../services';

@Component({
  template: '',
})
export abstract class DateRangedTabbedTableComponent
  implements OnInit, OnDestroy
{
  public tabs: any[];
  public selectedTabIndex: any;
  public get selectedTab(): any {
    return this.selectedTabIndex != null &&
      this.selectedTabIndex >= 0 &&
      this.selectedTabIndex < this.tabs.length
      ? this.tabs[this.selectedTabIndex]
      : null;
  }

  protected webSocketSubscriber: WebSocketSubscriber;

  constructor(
    protected appSettings: AppSettings,
    protected loggerService: LoggerService,
    protected liveConnectionService: LiveConnectionService
  ) {
    this.tabs = [
      Object.assign(new DateRangedEntity(), {
        id: 1,
        name: 'Live Log',
        duration: 0,
        isLive: true,
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        id: 2,
        name: 'Last Minute',
        duration: moment.duration(1, 'minutes'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        id: 3,
        name: 'Last Hour',
        duration: moment.duration(1, 'hours'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        id: 4,
        name: 'Last Day',
        duration: moment.duration(1, 'days'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        id: 5,
        name: 'Last Week',
        duration: moment.duration(1, 'weeks'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        id: 6,
        name: 'Last Month',
        duration: moment.duration(1, 'months'),
        showDateRangeSelector: false,
        values: [],
      }),
      Object.assign(new DateRangedEntity(), {
        id: 7,
        name: 'User Defined',
        showDateRangeSelector: true,
        values: [],
      }),
    ];
    this.webSocketSubscriber = new WebSocketSubscriber(
      this.appSettings,
      this.liveConnectionService
    );
    this.selectedTabIndex = 2;

    // this.tabs.forEach(
    //   m => {
    //       m.options = this._getMainChartOptions(),
    //       m.chart = []
    //   }

    // );
  }

  private _getMainChartOptions(data: any[] = []): any {
    return {
      title: { text: ' ' },
      chart: {
        zoomType: 'x',
      },
      series: [
        {
          name: '',
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
    };
  }

  protected abstract loadValues(): Observable<any>;
  protected abstract parseSocketMessageToData(
    targetTab: any,
    message: any
  ): any;
  protected abstract getLiveConnectionRequestOptions(): LiveConnectRequest[];

  public onTabSelectedChanged(selectedTabIndex?: number) {
    this.safeDisconnect();
    this.selectedTabIndex =
      typeof selectedTabIndex === typeof undefined
        ? this.selectedTabIndex
        : selectedTabIndex;
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
      this.loadValues().subscribe(
        (data) => this.onDataReceivedSuccess(this.selectedTab, data),
        (error) => this.onDataReceivedError(this.selectedTab, error)
      );
      return;
    }
    this.loadValuesViaSocket();
  }

  protected loadValuesViaSocket() {
    this.safeDisconnect();
    var selectedTab = this.selectedTab;
    this.webSocketSubscriber
      .connect(this.getLiveConnectionRequestOptions())
      .then(
        () =>
          this.webSocketSubscriber.messageStream.subscribe((message) =>
            this.onDataReceivedSuccess(
              selectedTab,
              this.parseSocketMessageToData(selectedTab, message)
            )
          ),
        (error: any) => this.onDataReceivedError(selectedTab, error)
      );
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

  protected onPreDataFetch(targetTab: any): void {
    targetTab.values.splice(0, targetTab.values.length);
  }

  protected onDataReceivedSuccess(targetTab: any, data: any | any[]): void {
    data = (data = data || []) instanceof Array ? data : [data];
    if (!targetTab.isLive) {
      targetTab.values.splice(0, targetTab.values.length);
    }
    targetTab.values.push(...data);
    targetTab.values = [...data];
  }

  protected onDataReceivedError(targetTab: any, error: any): void {
    this.loggerService.showErrorMessage(error);
  }

  public ngOnInit(): void {
    this.onTabSelectedChanged();
  }

  public ngOnDestroy(): void {
    this.webSocketSubscriber.disconnect();
  }
}
