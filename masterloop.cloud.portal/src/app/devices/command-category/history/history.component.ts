import * as moment from 'moment';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';

import {
  AppSettings,
  LoggerService,
  LiveConnectionService,
  LiveUpdateService,
  CommandService,
  DeviceService,
  IndexedDbService,
} from '../../../services';
import { DateRangedTabbedTableComponent } from '../../../common/date-ranged-tabbed-table.component';
import { LiveSubscriber, LiveConnectRequest } from '../../../core/models';
import { isUndefined } from 'util';
import { CommandStatus } from '../../../core/enums/command-status';
import { CommandHistoryModalComponent } from '../command-history-modal/command-history-modal.component';
import {
  MatDialogRef,
  MatDialogConfig,
  MatDialog,
} from '@angular/material/dialog';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';

import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

@Component({
  selector: 'app-device-history-table',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent extends DateRangedTabbedTableComponent {
  commandArguments: any[] = [];
  commandId: string;
  sendArguments;
  expiresAt;
  Status;
  dialogRef: MatDialogRef<CommandHistoryModalComponent>;
  config: MatDialogConfig = {
    backdropClass: 'custom-dialog-backdrop-class',
    panelClass: 'custom-dialog-panel-class',
    disableClose: false,
    width: '700px',
    height: 'min-content',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
  };
  messageList = [];
  commandSet = [];

  public statuses: any = {
    0: { class: 'amber', title: 'Sent' },
    1: { class: 'red', title: 'Expired' },
    2: { class: 'green', title: 'Executed' },
    3: { class: 'red', title: 'Rejected' },
  };

  public deviceId: string;
  deviceStatusColor;

  constructor(
    appSettings: AppSettings,
    loggerService: LoggerService,
    liveConnectionService: LiveConnectionService,
    protected commandService: CommandService,
    private deviceService: DeviceService,
    protected route: ActivatedRoute,
    public dialog: MatDialog,
    public cd: ChangeDetectorRef,
    protected indexedDbService: IndexedDbService
  ) {
    super(appSettings, loggerService, liveConnectionService);
    this.deviceId = route.snapshot.params['deviceId'];
    this.setDeviceStatusColor();
    //this.messageList = [];
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.deviceId).subscribe(
      (data) => {
        if (data != null) {
          pulseTime = data.To;
        }
        this.handleDeviceColorCode(pulseTime);
      },
      (error) => {
        this.loggerService.showErrorMessage(
          `Getting device[${this.deviceId}] pulse failed!`
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

  protected loadValues(): Observable<any> {
    return this.commandService.getDeviceCommandWithArguments(
      this.deviceId,
      this.selectedTab.from.toDate(),
      this.selectedTab.to.toDate(),
      this.selectedTab.name
    );
  }

  protected loadDeviceDetails(): Observable<any> {
    return this.commandService.loadDeviceCommands(this.deviceId);
  }

  protected onDataReceivedSuccess(targetTab: any, data: any | any[]): void {
    // console.log('on data', data);
    let args = [];
    let commands;
    if (!(data instanceof Array)) {
      if (typeof data.WasAccepted != 'undefined') {
        if (data.WasAccepted) {
          data.Arguments = this.sendArguments;
          data.ExpiresAt = this.expiresAt;
          data.Status = this.Status;
          let details = this.createDataArrayLiveLog(data);
          args.push(details);

          data = [];
          data.push(details);

          this.loadDeviceDetails().subscribe((deviceCommands) => {
            commands = deviceCommands['Metadata']['Commands'];
            let index = 0;
            args.forEach((argument, index) => {
              commands.forEach((command) => {
                if (
                  argument.Id == command.Id &&
                  command.Arguments &&
                  argument.Arguments
                ) {
                  command.Arguments.forEach((commandArgument) => {
                    argument.Arguments.forEach((argumentValue) => {
                      if (commandArgument.Id == argumentValue.Id) {
                        let argumentNameValue = new Object();
                        argumentNameValue['Name'] = commandArgument.Name;
                        argumentNameValue['Value'] = argumentValue.Value;
                        this.commandArguments.push(argumentNameValue);
                      }
                    });
                  });
                }
              });
              argument.Arguments = this.commandArguments;
              argument.$$index = index;
              index++;
              this.commandArguments = [];
            });
            if (commands && commands.length > 0) {
              data.forEach((value) => {
                commands.forEach((command) => {
                  if (value.Id == command.Id) {
                    value['Name'] = command.Name;
                    return value;
                  }
                });
              });
            }
            if (!targetTab.isLive) {
              return super.onDataReceivedSuccess(targetTab, data);
            }
            //targetTab.values.unshift(...data);
            targetTab.values.push(...data);
            targetTab.values = [...targetTab.values];
            this.cd.detectChanges();
          });
        }
        //if undefined
      } else {
        let value = new Object();
        value['Id'] = data.Id;
        value['ExpiresAt'] = data.ExpiresAt;
        value['OriginAccount'] = data.OriginAccount;
        value['Timestamp'] = data.Timestamp;
        value['Status'] = 0;

        this.sendArguments = data.Arguments;
        this.expiresAt = data.ExpiresAt;
        this.Status = data.Status;
        // targetTab.values.push(value);
        // targetTab.values = [...targetTab.values];
        // this.cd.detectChanges();
      }
    } else {
      args = data[0];
      commands = data[1]['Metadata']['Commands'];
      //handling arguments with name and value
      if (typeof args != 'undefined' && args && !targetTab.isLive) {
        let index = 0;
        args.forEach((argument, index) => {
          commands.forEach((command) => {
            if (
              argument.Id == command.Id &&
              command.Arguments &&
              argument.Arguments
            ) {
              command.Arguments.forEach((commandArgument) => {
                argument.Arguments.forEach((argumentValue) => {
                  if (commandArgument.Id == argumentValue.Id) {
                    let argumentNameValue = new Object();
                    argumentNameValue['Name'] = commandArgument.Name;
                    argumentNameValue['Value'] = argumentValue.Value;
                    this.commandArguments.push(argumentNameValue);
                  }
                });
              });
            }
          });
          argument.Arguments = this.commandArguments;
          argument.$$index = index;
          index++;
          this.commandArguments = [];
        });
        if (data instanceof Array) {
          data.splice(1, 1);
        }
        data = data[0];
        if (commands && commands.length > 0) {
          data.forEach((value) => {
            commands.forEach((command) => {
              if (value.Id == command.Id) {
                value['Name'] = command.Name;
                return value;
              }
            });
          });
        }
        if (!targetTab.isLive) {
          return super.onDataReceivedSuccess(targetTab, data);
        }
        // targetTab.values.unshift(...data);
        targetTab.values.push(...data);
        targetTab.values = [...data];
        this.cd.detectChanges();
      }
    }
  }
  /**
   * Open detailed command history in a modal view
   * @param observation
   */
  open(command: any) {
    let clickedCommand = Object.assign({}, command);
    const dialogRef = this.dialog.open(CommandHistoryModalComponent, {
      backdropClass: 'custom-dialog-backdrop-class',
      panelClass: 'custom-dialog-panel-class',
      disableClose: false,
      width: '700px',
      height: 'min-content',
      position: {
        top: '',
        bottom: '',
        left: '',
        right: '',
      },
      data: { clickedCommand },
    });

    dialogRef.afterClosed().subscribe((result) => {
      //dialogRef = null;
    });
  }
  /**
   * Create data array when receiving live command response
   * @param data
   */
  protected createDataArrayLiveLog(data: any) {
    var details = [];
    details['Arguments'] = data.Arguments;
    details['DeliveredAt'] = data.DeliveredAt;
    details['ExpiresAt'] = data.ExpiresAt;
    details['Id'] = data.Id;
    details['Status'] = this.setStatus(data.WasAccepted);
    details['Timestamp'] = data.Timestamp;
    details['WasAccepted'] = data.WasAccepted;
    details['OriginApplication'] = data.OriginApplication;
    details['OriginAddress'] = data.OriginAddress;
    details['OriginAccount'] = data.OriginAccount;
    details['OriginReference'] = data.OriginReference;
    details['ResultCode'] = data.ResultCode;
    details['Comment'] = data.Comment;

    return details;
  }
  /**
   * setting the status based on wasAccepted value
   * @param wasAccepted
   */
  setStatus(wasAccepted) {
    if (wasAccepted) {
      return CommandStatus.Executed;
    } else {
      return CommandStatus.Rejected;
    }
  }

  protected parseSocketMessageToData(targetTab: any, message: any) {
    var splits = null;
    let headers = message.headers.destination;
    if (
      !(splits = message.headers.destination.split('/')).length ||
      (splits = splits[splits.length - 1].split('.', 3)).length < 3 ||
      splits[0] != this.deviceId ||
      splits[0] != this.deviceId
    ) {
      return null;
    }
    let splitDestination = [];
    splitDestination = headers.split('/').slice(-1).pop().split('.');
    if (splitDestination.indexOf('C') == 1) {
      this.messageList.push(message.body);
      this.messageList.forEach((mesg) => {
        mesg['OriginAddress'] = message.headers.OriginAddress;
        mesg['OriginAccount'] = message.headers.OriginAccount;
        mesg['OriginApplication'] = message.headers.OriginApplication;
        mesg['WasAccepted'] = message.body.WasAccepted;
        mesg['OriginReference'] = message.headers.OriginReference;
        //mesg['WasAccepted'] = true;
      });
    } else {
      this.messageList[0]['WasAccepted'] = message.body.WasAccepted;
      this.messageList[0]['ResultCode'] = message.body.ResultCode;
      this.messageList[0]['Comment'] = message.body.Comment;
      this.messageList[0]['DeliveredAt'] = message.body.DeliveredAt;

      //return this.messageList[0];
    }
    return this.messageList[0];
  }

  protected getLiveConnectionRequestOptions(): LiveConnectRequest[] {
    return [
      Object.assign(new LiveConnectRequest(), {
        MID: this.deviceId,
        ConnectAllCommands: true,
      }),
    ];
  }

  getRowHeight(row) {
    if (!row) return 75;
    if (row.height === undefined) return 75;
    return row.height;
  }
}
