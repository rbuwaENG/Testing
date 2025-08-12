import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';

@Component({
  template: ''
})
export abstract class BasePlottableComponent implements OnInit {
  public abstract graphicOptions: any;
  public abstract from: moment.Moment;
  public abstract to: moment.Moment;
  protected readonly timestampMomentFormat: any;

  constructor() {
    this.timestampMomentFormat = moment.ISO_8601;
  }

  public abstract ngOnInit(): void;
  public abstract addDeviceObservation(device: any, observation: any): void;
  public abstract removeDeviceObservation(device: any, observation: any): void;
}
