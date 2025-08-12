import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import {
  DeviceService,
  ObservationService,
  LoggerService,
  EventService,
  IndexedDbService,
} from '../../../../services';
import { EventComponent } from '../events.component';
import { EventDetails, EventTableOverflowComponent } from './event-table-dialog.component';

@Component({
  selector: 'app-observation-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class EventTableComponent extends EventComponent {
  categories = {
    10: 'error',
    20: 'warning',
    30: 'information',
  };
  colors = {
    10: 'red',
    20: 'yellow',
    30: 'blue',
  };

  dialogRef: MatDialogRef<EventTableOverflowComponent>;
  dumpDetails: EventDetails = null;
  lastCloseResult: string;
  config: MatDialogConfig = {
    disableClose: false,
    width: '50%',
    height: '50%',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
  };

  constructor(
    protected route: ActivatedRoute,
    protected eventService: EventService,
    protected loggerService: LoggerService,
    protected indexedDbService: IndexedDbService,
    protected deviceService: DeviceService,
    public dialog: MatDialog
  ) {
    super(route, eventService, loggerService, indexedDbService, deviceService);
    this.eventsValues = [];
  }

  protected onPreDataFetch(): void {
    this.eventsValues.splice(0, this.eventsValues.length);
  }

  protected onDataReceivedSuccess(data: any): void {
    this.eventsValues.splice(0, this.eventsValues.length, ...data);
    this.eventsValues = [...this.eventsValues];
  }

  open(eventDetails: any) {
    this.dialogRef = this.dialog.open(EventTableOverflowComponent, this.config);    

    this.dialogRef.componentInstance.eventDetails = eventDetails;

    this.dialogRef.afterClosed().subscribe((result) => {
      this.lastCloseResult = result;
      this.dialogRef = null;
      this.dumpDetails = null;
    });
  }
}
