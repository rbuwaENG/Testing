import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { DeviceService } from '../../../services/device.service';
import { LoggerService } from '../../../services/logger.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { LocalStorageKeys } from '../../../core/constants';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss']
})
export class SendComponent implements OnInit {

  MID: string;
  sendCommands: any[] = [];
  rows = [];
  columns = [];

  constructor(private route: ActivatedRoute, private deviceService: DeviceService, private loggerService: LoggerService, private cache : LocalStorageService) {
    this.MID = route.snapshot.params['id'];
  }

  ngOnInit() {
    let device = this.cache.getDevice(this.MID);
    if(device != null){
      this.sendCommands = device['Metadata']['Commands'];
    }
    else{
      this.deviceService.getDeviceDetails(this.MID)
      .subscribe(data => {
        this.cache.updateDevice(data);
        this.sendCommands = data['Metadata']['Commands'];       
      }, error => {
        this.loggerService.showErrorMessage("Getting device commands failed!");
      });
    }
    //this.sortCommandsByName();
  }

  sortCommandsByName() {
    this.sendCommands.sort(function(a, b){
      if(a.Name < b.Name) { return -1; }
      if(a.Name > b.Name) { return 1; }
      return 0;
   });
  }

  refreshDeviceDetails() {
    sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
  }

}