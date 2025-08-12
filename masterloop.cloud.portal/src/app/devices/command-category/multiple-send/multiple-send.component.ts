import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { DeviceService } from '../../../services/device.service';
import { LoggerService } from '../../../services/logger.service';
import { DataConvertion } from '../../../common/dataconvertion';
import { LocalStorageService } from '../../../services/local-storage.service';
import { LocalStorageKeys } from '../../../core/constants';
import {
  CommandService,
  IndexedDbService,
  SettingService,
} from '../../../services';
import { CommandStatus } from '../../../core/enums/command-status';
import { WebSocketSubscriber, LiveConnectRequest } from '../../../core/models';
import { AppSettings, LiveConnectionService } from '../../../services';
import { timer } from 'rxjs';
import { dataTypes } from '../../../core/constants/dataType-names';
import { CommandHistoryModalComponent } from '../command-history-modal/command-history-modal.component';
import {
  MatDialogConfig,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';

@Component({
  selector: 'app-multiple-send',
  templateUrl: './multiple-send.component.html',
  styleUrls: ['./multiple-send.component.scss'],
})
export class MultipleSendComponent implements OnInit {
  dialogRef: MatDialogRef<CommandHistoryModalComponent>;
  config: MatDialogConfig = {
    disableClose: false,
    width: '700px',
    height: 'auto',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
  };

  public statuses: any = {
    0: { class: 'amber', title: 'Sent' },
    1: { class: 'red', title: 'Expired' },
    2: { class: 'green', title: 'Executed' },
    3: { class: 'red', title: 'Rejected' },
  };

  expireTimes = [
    { Name: 'Never', value: null },
    { Name: '1 minute', value: 1 },
    { Name: '5 minutes', value: 5 },
    { Name: '15 minutes', value: 15 },
    { Name: '1 hour', value: 60 },
    { Name: '24 hours', value: 1440 },
  ];
  deviceStatusColor;

  protected webSocketSubscriber: WebSocketSubscriber;
  MID: string;
  commandId: any;
  commandName: any = 'Lock';
  editing = {};
  editSendCommands = [];
  commandMetaData = [];
  dataConversion = new DataConvertion();
  requestObj = {};
  commandTime = 60;
  today = new Date();
  hasCommands: boolean = false;
  commandResponse: any[] = [];
  commandArguments: any[] = [];
  commands: any[] = [];
  expiresAt;
  timerSubscriber: any = null;
  checkedState = [];
  commandText = [];
  originInfo = [];

  constructor(
    private route: ActivatedRoute,
    private deviceService: DeviceService,
    private loggerService: LoggerService,
    private router: Router,
    private cache: LocalStorageService,
    protected commandService: CommandService,
    protected appSettings: AppSettings,
    protected liveConnectionService: LiveConnectionService,
    public dialog: MatDialog,
    protected settingService: SettingService,
    protected indexedDbService: IndexedDbService
  ) {
    this.MID = route.snapshot.params['id'];
    this.webSocketSubscriber = new WebSocketSubscriber(
      this.appSettings,
      this.liveConnectionService
    );
    this.loadValuesViaSocket();
  }

  ngOnInit() {
    this.setDeviceStatusColor();
    let device = this.cache.getDevice(this.MID);
    //setting up origin and device name/version
    //this.setOriginInfo();
    if (device != null) {
      this.commandMetaData = device['Metadata']['Commands'];
      this.sortCommandById();
      //this.addPlaceHolderForCommandList();
      if (this.commandMetaData.length > 0) {
        //enable send command button
        this.hasCommands = true;
        let commands = this.commandMetaData[0];
        this.commandId = commands['Id'];
        this.updateEditSendCommandArguments();
      }
    } else {
      this.deviceService.getDeviceDetails(this.MID).subscribe(
        (data) => {
          this.commandMetaData = data['Metadata']['Commands'];
          this.cache.updateDevice(data);
          this.sortCommandById();
          //this.addPlaceHolderForCommandList();
          if (this.commandMetaData.length > 0) {
            //enable send command button
            this.hasCommands = true;
            let commands = this.commandMetaData[0];
            this.commandId = commands['Id'];
            this.updateEditSendCommandArguments();
          }
        },
        (error) => {
          this.loggerService.showErrorMessage(
            'Getting device send commands failed!'
          );
        }
      );
    }
    this.executeCommandExpired();
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

  setOriginInfo() {
    this.originInfo['OriginReference'] = this.settingService.getBrowserInfo();
    this.settingService.getIpAddress().subscribe((data) => {
      if (data != null) {
        this.originInfo['OriginAddress'] = data.ip;
      } else {
        this.originInfo['OriginAddress'] = null;
      }
    });
  }

  addPlaceHolderForCommandList() {
    let commands = [];
    let isAdded = true;
    this.commandMetaData.forEach((element) => {
      if (isAdded) {
        var placeHoder = {
          Id: -1,
          Name: 'Choose command',
        };
        commands.push(placeHoder);
      }
      commands.push(element);
      isAdded = false;
    });
    this.commandMetaData = commands;
  }

  sortCommandById() {
    this.commandMetaData.sort(function (a, b) {
      return a.Id - b.Id;
    });
  }

  sortCommandsByName() {
    this.commandMetaData.sort(function (a, b) {
      if (a.Name < b.Name) {
        return -1;
      }
      if (a.Name > b.Name) {
        return 1;
      }
      return 0;
    });
  }

  executeCommandExpired() {
    // set command expiration in milliseconds
    const source = timer(1000, 20000);
    this.timerSubscriber = source.subscribe((val) => {
      this.setCommandExpired();
    });
  }

  setCommandExpired() {
    if (this.commandResponse.length > 0) {
      let commands = [];
      this.commandResponse.forEach((element) => {
        if (
          (typeof element.DeliveredAt == 'undefined' ||
            element.DeliveredAt == null) &&
          (typeof element.WasAccepted == 'undefined' ||
            element.WasAccepted == null)
        ) {
          element['Status'] = this.isCommandExpired(element.ExpiresAt)
            ? CommandStatus.Expired
            : CommandStatus.Sent;
        }
        commands.push(element);
        this.commandResponse = commands;
      });
    }
  }

  protected loadValuesViaSocket() {
    this.webSocketSubscriber
      .connect(this.getLiveConnectionRequestOptions())
      .then(
        () =>
          this.webSocketSubscriber.messageStream.subscribe((message) => {
            let commands = [];
            let msg = message.body;
            let commandResponse = message.headers.destination
              .replace('/', '.')
              .split('.');
            //update only for command response(CR),not for the command(C)
            if (commandResponse.indexOf('CR') != -1) {
              this.commandResponse.forEach((element) => {
                let request = new Date(element.Timestamp);
                let response = new Date(msg.Timestamp);
                if (
                  request.getTime() == response.getTime() &&
                  element.Id == msg.Id
                ) {
                  element['Status'] = this.setStatus(msg.WasAccepted);
                  element['WasAccepted'] = msg.WasAccepted;
                  element['DeliveredAt'] = msg.DeliveredAt;
                  element['ResultCode'] = msg.ResultCode;
                  element['Comment'] = msg.Comment;
                } else {
                  if (
                    typeof element.DeliveredAt == 'undefined' &&
                    element.DeliveredAt == null
                  ) {
                    element['Status'] = this.isCommandExpired(element.ExpiresAt)
                      ? CommandStatus.Expired
                      : CommandStatus.Sent;
                  }
                }
                commands.push(element);
                this.commandResponse = commands;
              });
            }
          }),
        (error: any) => this.onDataReceivedError(error)
      );
  }

  protected getLiveConnectionRequestOptions(): LiveConnectRequest[] {
    return [
      Object.assign(new LiveConnectRequest(), {
        MID: this.MID,
        ConnectAllCommands: true,
      }),
    ];
  }

  setCommandStatus(argumentValues: any[]) {
    let args = [];
    args = argumentValues;
    let commands = this.commandMetaData;
    //handling arguments with name and value
    if (typeof args != 'undefined' && args) {
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
      // if ((data instanceof Array)) {
      //   data.splice(1, 1);
      // }
      //data = argumentValues;
      if (commands && commands.length > 0) {
        argumentValues.forEach((value) => {
          commands.forEach((command) => {
            if (value.Id == command.Id) {
              value['Name'] = command.Name;
              return value;
            }
          });
        });
      }
    }
    let previousStatuses = [];
    this.commandResponse.reverse().forEach((element) => {
      previousStatuses.push(element);
    });
    previousStatuses.push(args[0]);
    this.commandResponse = previousStatuses.reverse();
  }

  updateEditSendCommandArguments(): void {
    this.editSendCommands = [];
    this.commandMetaData.forEach((item, index) => {
      if (this.commandMetaData[index]['Id'] == this.commandId) {
        this.commandName = this.commandMetaData[index]['Name'];
        if (item.Arguments != null) {
          this.commandMetaData[index]['Arguments'].forEach((item, index) => {
            this.editing[index + '-Value'] = true;
            this.editSendCommands.push({
              Id: item['Id'],
              Name: item['Name'],
              Value: '',
              DataType: this.dataConversion.convertDataTypes(item['DataType']),
            });
          });
        }
      }
    });
  }

  onCommandSelect(event: any) {
    this.clearArgumentValues();
    this.updateEditSendCommandArguments();
  }

  sendCommands() {
    this.today = new Date();
    this.editSendCommands.forEach((element) => {
      if (
        (element.DataType == dataTypes.Binary ||
          element.DataType == dataTypes.Boolean) &&
        element.Value == ''
      ) {
        element.Value = false;
      }
    });
    let commands = [];
    this.requestObj = {
      Id: this.commandId,
      Timestamp: this.today.toISOString(),
      ExpiresAt:
        this.commandTime == null
          ? null
          : new Date(
              this.today.getFullYear(),
              this.today.getMonth(),
              this.today.getDate(),
              this.today.getHours(),
              this.today.getMinutes() + this.commandTime,
              this.today.getSeconds()
            ).toISOString(),
      Arguments: this.editSendCommands.map((item) => ({
        Id: item['Id'],
        Value: item['Value'],
      })),
    };

    this.deviceService
      .updateSendCommand(
        this.MID,
        this.commandId,
        this.requestObj,
        this.originInfo
      )
      .subscribe(
        (data) => {
          this.loggerService.showSuccessfulMessage(
            'Updating device send commands success!'
          );
          //set sent status
          this.requestObj['Status'] = 0;
          commands.push(this.requestObj);
          this.setCommandStatus(commands);
          this.commands = commands;
          //this.clearArgumentValues();
        },
        (error) => {
          this.loggerService.showSuccessfulMessage(
            'Updating device send commands failed!'
          );
        }
      );
  }

  setStatus(wasAccepted) {
    if (wasAccepted) {
      return CommandStatus.Executed;
    } else {
      return CommandStatus.Rejected;
    }
  }

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
    // this.dialogRef = this.dialog.open(
    //   CommandHistoryModalComponent,
    //   this.config
    // );

    // this.dialogRef.componentInstance.details = command;

    // this.dialogRef.afterClosed().subscribe(result => {
    //   this.dialogRef = null;
    // });
  }

  isCommandExpired(expiredTime: any): boolean {
    return Date.now() - new Date(expiredTime).getTime() > 0 ? true : false;
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    this.editSendCommands[rowIndex][cell] =
      row.DataType == dataTypes.Binary || row.DataType == dataTypes.Boolean
        ? event.checked
        : event.target.value;
  }

  onCheckEvent(event, cell, row, rowIndex) {
    this.editSendCommands[rowIndex][cell] = event;
  }

  validateTextInput(event, row) {
    if (
      event.key.toLowerCase() == 'backspace' ||
      event.key.toLowerCase() == 'delete' ||
      (event.ctrlKey && event.key.toLowerCase() == 'v')
    )
      return true;

    if (!this.validateArgument(row.DataType, event.key)) {
      event.preventDefault();
      return false;
    } else {
      return true;
    }
  }

  validateArgument(dataType: string, value: any): boolean {
    let valid = false;
    switch (dataType) {
      case dataTypes.Double:
        valid = /^-?\d*[.]?\d*$/.test(value);
        break;
      case dataTypes.Integer:
        valid = /^-?\d*$/.test(value);
        break;
      case dataTypes.Position:
        valid = /^-?\d*[.,]?\d*$/.test(value);
        break;
      case dataTypes.String:
        valid = true;
        break;
      default:
        valid = false;
    }
    return valid;
  }

  clearArgumentValues() {
    this.editSendCommands.forEach((element) => {
      if (
        element.DataType == dataTypes.Binary ||
        element.DataType == dataTypes.Boolean
      ) {
        if (!element.Value) {
          element.Value = false;
          this.checkedState[element.$$index] = false;
        } else {
          element.Value = true;
          this.checkedState[element.$$index] = true;
        }
      } else {
        element.Value = '';
        this.commandText[element.$$index] = '';
      }
    });
  }

  public ngOnDestroy(): void {
    this.webSocketSubscriber.disconnect();
    this.timerSubscriber.unsubscribe();
  }

  loadCommandHistory() {
    this.router.navigateByUrl('devices/' + this.MID + '/commandsHistory');
  }

  onDataReceivedError(error) {
    this.loggerService.showErrorMessage(error);
  }

  refreshDeviceDetails() {
    sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
    //this.webSocketSubscriber.disconnect();
    this.timerSubscriber.unsubscribe();
    this.commandResponse = [];
    this.clearArgumentValues();
  }
}
