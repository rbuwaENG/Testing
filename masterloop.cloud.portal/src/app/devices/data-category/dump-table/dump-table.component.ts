import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { WebSocketSubscriber, LiveConnectRequest } from '../../../core/models';
import {
  AppSettings,
  DeviceService,
  IndexedDbService,
  LiveConnectionService,
} from '../../../services';
import { ActivatedRoute } from '@angular/router';
import { LoggerService } from '../../../services/logger.service';
import {
  MatDialogRef,
  MatDialog,
  MatDialogConfig,
} from '@angular/material/dialog';
import {
  DumpTableOverflowDialog,
  DumpDetails,
} from '../dump-table/dump-table-dialog.component';
import * as moment from 'moment';
import { ExportToCsv } from 'export-to-csv';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';

@Component({
  selector: 'app-dump-table',
  templateUrl: './dump-table.component.html',
  styleUrls: ['./dump-table.component.scss'],
})
export class DumpTableComponent implements OnInit {
  protected webSocketSubscriber: WebSocketSubscriber;
  MID: string;
  isStart: boolean = false;
  dumpResult: any[] = [];
  isStop: boolean = true;
  deviceStatusColor;

  constructor(
    private route: ActivatedRoute,
    private loggerService: LoggerService,
    private appSettings: AppSettings,
    private liveConnectionService: LiveConnectionService,
    public dialog: MatDialog,
    private cd: ChangeDetectorRef,
    private indexedDBService: IndexedDbService,
    private deviceService: DeviceService
  ) {
    this.MID = route.snapshot.params['deviceId'];
    this.webSocketSubscriber = new WebSocketSubscriber(
      this.appSettings,
      this.liveConnectionService
    );
  }

  dialogRef: MatDialogRef<DumpTableOverflowDialog>;
  dumpDetails: DumpDetails = null;
  lastCloseResult: string;
  config: MatDialogConfig = {
    disableClose: false,
    width: '80%',
    height: '80%',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
  };

  ngOnInit() {
    if (!this.isStart) {
      this.isStart = true;
      this.isStop = false;
      this.loadValuesViaSocket();
      this.setDeviceStatusColor();
    }
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.MID).subscribe((data) => {
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

  getDeviceStatusFromIndexedDb() {
    this.indexedDBService.getDevicesFromIndexedDb().subscribe((result) => {
      if (result.length > 0) {
        let allDevices = result[0].Value;
        let device = allDevices.filter((d) => d.MID == this.MID);
        if (device != null) {
          this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
            device[0].LatestPulse
          );
        }
      }
    });
  }

  protected getLiveConnectionRequestOptions(): LiveConnectRequest[] {
    return [
      Object.assign(new LiveConnectRequest(), {
        MID: this.MID,
        ConnectAllCommands: true,
        ConnectAllObservations: true,
        ReceiveDevicePulse: true,
      }),
    ];
  }

  protected loadValuesViaSocket() {
    this.webSocketSubscriber
      .connect(this.getLiveConnectionRequestOptions())
      .then(
        () =>
          this.webSocketSubscriber.messageStream.subscribe((message) => {
            let msg = message.body;
            let routingKey = message.headers.destination.split('/');
            let dump = [];
            dump['Timestamp'] = moment().format('YYYY-MM-DD HH:mm:ss');
            dump['RoutingKey'] = routingKey[3];
            dump['Payload'] = JSON.stringify(msg);
            this.dumpResult.push(dump);
            this.dumpResult = [...this.dumpResult];
            this.cd.detectChanges();
          }),
        (error: any) => this.onDataReceivedError(error)
      );
  }

  protected onDataReceivedError(error) {
    this.isStart = false;
    this.isStop = true;
    this.loggerService.showErrorMessage(error);
  }

  public startSubscribeToLiveData() {
    this.ngOnInit();
  }

  public stopSubscribedToLiveData() {
    this.webSocketSubscriber.disconnect();
    this.isStart = false;
    this.isStop = true;
    this.cd.detectChanges();
  }

  public clearSubscribedData() {
    this.dumpResult = [];
  }

  public ngOnDestroy(): void {
    this.webSocketSubscriber.disconnect();
  }

  open(dump: any) {
    this.dialogRef = this.dialog.open(DumpTableOverflowDialog, this.config);
    this.dumpDetails = {
      MID: this.MID,
      CurrentValue: dump.Payload,
      Timestamp: dump.Timestamp,
    };

    this.dialogRef.componentInstance.dump = this.dumpDetails;

    this.dialogRef.afterClosed().subscribe((result) => {
      this.lastCloseResult = result;
      this.dialogRef = null;
      this.dumpDetails = null;
    });
  }

  exportToCSV() {
    if (this.dumpResult.length == 0) {
      this.loggerService.showErrorMessage('No result to export.');
    } else {
      const options = {
        filename: 'Dump_' + this.MID,
        fieldSeparator: ',',
        quoteStrings: '"',
        decimalSeparator: '.',
        showLabels: false,
        showTitle: false,
        //title: 'Dump Result',
        useTextFile: false,
        useBom: false,
        useKeysAsHeaders: true,
      };
      const csvExporter = new ExportToCsv(options);
      let items = [];
      this.dumpResult.forEach((element) => {
        let item = {
          Timestamp: element.Timestamp,
          RoutingKey: element.RoutingKey,
          Payload: element.Payload,
        };
        items.push(item);
      });
      csvExporter.generateCsv(items);
    }
  }
}
