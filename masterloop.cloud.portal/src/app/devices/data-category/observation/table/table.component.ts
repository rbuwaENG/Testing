import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  MatDialogRef,
  MatDialog,
  MatDialogConfig,
} from '@angular/material/dialog';
import {
  AppSettings,
  ObservationService,
  LoggerService,
  LiveConnectionService,
  IndexedDbService,
  TemplateService
} from '../../../../services';
import { ObservationComponent } from '../observation.component';
import { ObservationDataType } from '../../../../core/enums';
import {
  ObservationOverflowDialog,
  Details,
} from '../../observations/observation-dialog.component';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NumberConstants } from '../../../../core/constants/number.constants';

@Component({
  selector: 'app-observation-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class ObservationTableComponent extends ObservationComponent {
  public OBSEVATION_DATA_TYPE: any = ObservationDataType;
  tableHeaderName: string = "Value";

  constructor(
    protected route: ActivatedRoute,
    protected appSettings: AppSettings,
    protected observationService: ObservationService,
    protected loggerService: LoggerService,
    protected liveConnectionService: LiveConnectionService,
    public dialog: MatDialog,
    private cd: ChangeDetectorRef,
    protected indexedDbService: IndexedDbService,
    protected cache: LocalStorageService,
    protected templateService: TemplateService
  ) {
    super(
      appSettings,
      loggerService,
      liveConnectionService,
      route,
      observationService,
      indexedDbService,
      cache,
      templateService
    );
  }

  dialogRef: MatDialogRef<ObservationOverflowDialog>;
  obsDetails: Details = null;
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

  isString(val) {
    return typeof val === 'string';
  }

  open(observation: any, mid: string, observationName: string) {
    this.dialogRef = this.dialog.open(ObservationOverflowDialog, this.config);
    this.obsDetails = {
      MID: mid,
      CurrentValue: observation.Value,
      ObservationName: observationName,
      Timestamp: observation.Timestamp,
    };

    this.dialogRef.componentInstance.details = this.obsDetails;

    this.dialogRef.afterClosed().subscribe((result) => {
      this.lastCloseResult = result;
      this.dialogRef = null;
      this.obsDetails = null;
    });
  }

  protected onDataReceivedSuccess(targetTab: any, data: any | any[]): void {
    data = (data = data || []) instanceof Array ? data : [data];
    if (this.dataType == ObservationDataType.Position) {
      data = data.map((elem: any) => ({
        Timestamp: elem.Timestamp,
        Latitude: elem.Value.Latitude,
        Longitude: elem.Value.Longitude,
        Altitude: elem.Value.Altitude,
      }));
    } else if (this.dataType == ObservationDataType.Statistics) {
      data = data.map((elem: any) => ({
        Timestamp: elem.Timestamp,
        Count: elem.Value.Count,
        Maximum: elem.Value.Maximum,
        Mean: elem.Value.Mean,
        Median: elem.Value.Median,
        Minimum: elem.Value.Minimum,
        StdDev: elem.Value.StdDev,
        From: elem.Value.From,
        To: elem.Value.To,
      }));
    } else {
      data = data;
    }

    this.tableHeaderName = `Value ${this.abbrieviation ? `(${this.abbrieviation})` : ""}`;

    if (this.observation.Quantity === NumberConstants.EnumerationGroupQuantityId) {
      data = data.map((dataItem) => {
        const matchingEnumItem = this.enumItems.find((enumItem) => enumItem.Id === dataItem.Value);
        if (matchingEnumItem) {
          return { Timestamp: dataItem.Timestamp, Value: `${dataItem.Value}/ ${matchingEnumItem.Name}` };
        } else {
          return dataItem;
        }
      });
    }

    if (!targetTab.isLive) {
      return super.onDataReceivedSuccess(targetTab, data);
    }
    targetTab.values.push(...data);
    targetTab.values = [...targetTab.values];
    this.cd.detectChanges();
  }
}
