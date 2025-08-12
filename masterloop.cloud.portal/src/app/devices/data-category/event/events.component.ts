import * as moment from 'moment';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import {
  LoggerService,
  EventService,
  IndexedDbService,
  DeviceService,
} from '../../../services';

import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';

@Component({
  template: '',
})
export abstract class EventComponent implements OnInit {
  deviceId: any;
  from: moment.Moment;
  to: moment.Moment;
  tabs: any[];
  eventsValues: any[];
  selectedTabIndex: any;
  customDateSelected: any;
  customTo: any;
  customFrom: any;
  handler: any;
  nodata = false;
  deviceStatusColor;

  protected get selectedTab(): any {
    return this.selectedTabIndex != null &&
      this.selectedTabIndex >= 0 &&
      this.selectedTabIndex < this.tabs.length
      ? this.tabs[this.selectedTabIndex]
      : null;
  }

  constructor(
    protected route: ActivatedRoute,
    protected eventService: EventService,
    protected loggerService: LoggerService,
    protected indexedDbService: IndexedDbService,
    protected deviceService: DeviceService
  ) {
    this.deviceId = route.snapshot.params['id'];
    this.selectedTabIndex = 1;
    this.tabs = [
      { label: 'Last Minute', duration: moment.duration(1, 'minutes') },
      { label: 'Last Hour', duration: moment.duration(1, 'hours') },
      { label: 'Last Day', duration: moment.duration(1, 'days') },
      { label: 'Last Week', duration: moment.duration(1, 'weeks') },
      { label: 'Last Month', duration: moment.duration(1, 'months') },
      { label: 'User Defined' },
    ];
  }

  protected loadEventValues(
    deviceId: any,
    from: moment.Moment,
    to: moment.Moment
  ): Observable<any> {
    return this.eventService.getEventValues(
      deviceId,
      from.toDate(),
      to.toDate(),
      this.selectedTab.label
    );
  }

  public onTabSelectedChanged(): void {
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
      this.loadEventValues(this.deviceId, this.from, this.to).subscribe(
        (data) => this.onDataReceivedSuccess(data),
        (error) => this.onDataReceivedError(error)
      );
    } else {
      this.to = moment();
      this.from = this.to;
      this.loadEventValues(this.deviceId, this.from, this.to).subscribe(
        (data) => this.onDataReceivedSuccess(data),
        (error) => this.onDataReceivedError(error)
      );
    }
  }

  protected abstract onPreDataFetch(): void;
  protected abstract onDataReceivedSuccess(data: any): void;

  protected onDataReceivedError(error: any): void {
    this.loggerService.showErrorMessage('Getting event values failed!');
  }

  public ngOnInit(): void {
    this.onTabSelectedChanged();
    this.setDeviceStatusColor();
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
    if (!this.customFrom && !this.customTo) {
      return;
    }
    this.from = moment.parseZone(this.customFrom.toString());
    this.to = moment.parseZone(this.customTo.toString());
    if (this.from && this.to) {
      if (moment.duration(this.to.diff(this.from)).asDays() < 61) {
        if (this.to.diff(this.from) > 0) {
          this.onPreDataFetch();
          this.loadEventValues(this.deviceId, this.from, this.to).subscribe(
            (data) => this.onDataReceivedSuccess(data),
            (error) => this.onDataReceivedError(error)
          );
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
}
