import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DeviceService, IndexedDbService } from 'src/app/services';
import { DeviceDelete } from '../general-category/general-device-details.component';

@Component({
  selector: 'app-device-delete',
  templateUrl: './device-delete.component.html',
  styleUrls: ['./device-delete.component.scss']
})
export class DeviceDeleteComponent implements OnInit {

  confirmMID;
  MIDMatches;

  constructor(
    public dialogRef: MatDialogRef<DeviceDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeviceDelete,
    private deviceService: DeviceService,
    private indexedDbService: IndexedDbService) { }

  ngOnInit(): void {
  }

  onNoClick(){
    this.dialogRef.close();
  }


  onValueChange(input: string): void {  
    if(this.data.MID == input) {
      this.MIDMatches = true;
    }
  }

  deleteDevice() {
    //this.indexedDbService.deleteDeviceFromIndexedDb(this.data.MID);
    this.deviceService.deleteDevice(this.data.MID).subscribe(result => {
      if(result == null) {
        this.indexedDbService.deleteDeviceFromIndexedDb(this.data.MID);
        this.dialogRef.close('success');
      } else {
        this.dialogRef.close('fail');
      }
    });
  }

}
