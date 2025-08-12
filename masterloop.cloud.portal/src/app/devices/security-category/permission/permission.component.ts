import { Component, OnInit } from '@angular/core';
import {
  DeviceService,
  IndexedDbService,
  LoggerService,
} from '../../../services';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';

@Component({
  selector: 'app-permission',
  templateUrl: './permission.component.html',
  styleUrls: ['./permission.component.scss'],
})
export class PermissionComponent implements OnInit {
  MID: string;
  permissons: any;
  deviceStatusColor;

  constructor(
    route: ActivatedRoute,
    private deviceService: DeviceService,
    private loggerService: LoggerService,
    protected indexedDbService: IndexedDbService
  ) {
    this.MID = route.snapshot.params['id'];
  }

  ngOnInit() {
    this.setDeviceStatusColor();
    this.deviceService.getDevicePermissions(this.MID).subscribe(
      (data) => {
        this.permissons = data;
      },
      (error) => {
        this.loggerService.showErrorMessage(
          `Getting device[${this.MID}] permission details failed!`
        );
      }
    );
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.MID).subscribe(
      (data) => {
        if (data != null) {
          pulseTime = data.To;
        }
        this.handleDeviceColorCode(pulseTime);
      },
      (error) => {
        this.loggerService.showErrorMessage(
          `Getting device[${this.MID}] pulse failed!`
        );
      }
    );
  }

  handleDeviceColorCode(pulseTime) {
    this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
      pulseTime,
      'UTC'
    );
  }
}
