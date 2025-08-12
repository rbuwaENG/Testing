import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeviceStatusColorGenerator } from 'src/app/core/helpers/device-color-generator.helper';
import { SecurityService, LoggerService, IndexedDbService, DeviceService } from 'src/app/services';
import { DeviceSecurity } from 'src/app/core/models/device-security';

@Component({
  selector: 'app-security-popup',
  templateUrl: './security-popup.component.html',
  styleUrls: ['./security-popup.component.scss']
})
export class SecurityPopupComponent implements OnInit {
  MID: string;
  deviceSecurityData: DeviceSecurity;
  deviceStatusColor: string;
  readonly TIME_FORMAT: string = 'UTC';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any,
    private securityService: SecurityService,
    private loggerService: LoggerService,
    protected indexedDbService: IndexedDbService,
    private deviceService: DeviceService,
    public dialogRef: MatDialogRef<SecurityPopupComponent>,) {
    this.MID = data.MID;
  }

  ngOnInit() {
    this.setDeviceStatusColor();
    this.securityService.getSecurityValues(this.MID).subscribe(
      (data) => {
        this.deviceSecurityData = data;
      },
      (error) => {
        this.loggerService.showErrorMessage(
          `Getting device[${this.MID}] security details failed!`
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
      this.TIME_FORMAT
    );
  }

  onCloseClick() {
    this.dialogRef.close();
  }

}
