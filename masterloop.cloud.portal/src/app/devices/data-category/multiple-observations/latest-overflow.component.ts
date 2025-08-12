import { Component, Inject, Input, NgZone, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'overflow-dialog',
  template: `
    <div
      style="word-wrap: break-word; overflow-x: hidden; height: 100% !important;position: relative;"
    >
      <h5 class="mt-0">
        {{ modalInformation.MID }}, observation {{ modalInformation.ObservationName }} at
        {{ modalInformation.Timestamp }}
      </h5>

      <p>{{ modalInformation.CurrentValue }}</p>
      <button
        mat-button
        type="button"
        (click)="close()"
        style="position: absolute; bottom: 0px; right: 0px; background-color:#efefef"
      >
        Close
      </button>
    </div>
  `
})
export class LatestOverflowDialog implements OnInit {
  @Input() details: Details;

  
  modalInformation: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Details,
    public dialogRef: MatDialogRef<LatestOverflowDialog>,
    private zone : NgZone) {
      setTimeout(() => { 
        this.zone.run(() => 
          this.setModalInfo()
        ) });
    }

    ngOnInit() {
    }

    setModalInfo() {
      this.modalInformation = this.data['observationOverflow'];
    }

    close() {
      this.zone.run(() => {
        this.dialogRef.close();
      });
      
    }
}

export interface Details {
  MID: string;
  ObservationName: string;
  Timestamp: string;
  CurrentValue: string;
}
