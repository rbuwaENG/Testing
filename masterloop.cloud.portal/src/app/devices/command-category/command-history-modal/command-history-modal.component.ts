import { Component, OnInit, Input, Inject, NgZone } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommandStatus } from '../../../core/enums/command-status';

interface DialogData {
  firstname: string;
}

@Component({
  selector: 'app-command-history-modal',
  templateUrl: './command-history-modal.component.html',
  styleUrls: ['./command-history-modal.component.scss'],
})
export class CommandHistoryModalComponent implements OnInit {
  modalInformation: any;
  public statuses: any = {
    0: { class: 'amber', title: 'Sent' },
    1: { class: 'red', title: 'Expired' },
    2: { class: 'green', title: 'Executed' },
    3: { class: 'red', title: 'Rejected' },
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public dialogRef: MatDialogRef<CommandHistoryModalComponent>,
    private zone: NgZone
  ) {
    this.modalInformation = this.data['clickedCommand'];
    setTimeout(() => {
      this.zone.run(
        () => this.setMoreCommandInformation()
        // this.close()
      );
    });
  }

  ngOnInit() {}

  setMoreCommandInformation() {
    if (typeof this.data != 'undefined' || this.data != null) {
      this.modalInformation = this.data['clickedCommand'];
    }
  }

  getStatus() {}

  close(event = null) {
    // if(event != null) {
    //   let elements = document.getElementsByTagName("mat-dialog-container");; // this.elem.nativeElement.querySelectorAll('.ol-viewport');
    //   for(var i = 0; i < elements.length ; i++) {
    //     elements[i].remove();
    //     this.dialogRef.close();
    //   }
    // }
    this.zone.run(() => {
      this.dialogRef.close();
    });
  }
}
