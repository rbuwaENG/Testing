import { Component, Input } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'dump-overflow-dialog',
  template: `
    <div
      style="word-wrap: break-word; overflow-x: hidden; height: 100% !important;position: relative;"
    >
      <h5 class="mt-0">Stream for {{ dump.MID }} at {{ dump.Timestamp }}</h5>

      <p>{{ dump.CurrentValue }}</p>
      <button
        mat-button
        type="button"
        (click)="dialogRef.close()"
        style="position: absolute; bottom: 0px; right: 0px; background-color:#efefef"
      >
        Close
      </button>
    </div>
  `
})
export class DumpTableOverflowDialog {
  @Input() dump: DumpDetails;

  constructor(public dialogRef: MatDialogRef<DumpTableOverflowDialog>) {}
}

export interface DumpDetails {
  MID: string;
  Timestamp: string;
  CurrentValue: string;
}
