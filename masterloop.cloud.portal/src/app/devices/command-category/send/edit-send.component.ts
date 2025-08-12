import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { DeviceService } from '../../../services/device.service';
import { LoggerService } from '../../../services/logger.service';
import { DataConvertion } from '../../../common/dataconvertion';
import { LocalStorageService } from '../../../services/local-storage.service';
import { LocalStorageKeys } from '../../../core/constants';
import { dataTypes } from '../../../core/constants/dataType-names';

@Component({
  selector: 'app-edit-send',
  templateUrl: './edit-send.component.html',
  styleUrls: ['./edit-send.component.scss']
})

export class EditSendComponent implements OnInit {

  MID: string;
  commandId;
  commandName;
  editing = {};
  editSendCommands = [];
  serviceData = [];
  dataConversion = new DataConvertion();
  expireTimes = [
    { Name: 'Never', value: null },
    { Name: '1 minute', value: 1 },
    { Name: '5 minutes', value: 5 },
    { Name: '15 minutes', value: 15 },
    { Name: '1 hour', value: 60 },
    { Name: '24 hours', value: 1440 },
  ];

  requestObj = {};
  commandTime = 60;
  today = new Date();
  checkedState = [];
  commandText  = [];

  constructor(private route: ActivatedRoute, private deviceService: DeviceService, private loggerService: LoggerService, private router: Router,private cache : LocalStorageService) {
    this.MID = route.snapshot.params['id'];
    this.commandId = route.snapshot.params['commandId'];
  }

  ngOnInit() {
    let device = this.cache.getDevice(this.MID);
    if(device != null) {
      this.serviceData = device['Metadata']['Commands'];
      this.updateEditSendCommandArguments();
    }
    else {
      this.deviceService.getDeviceDetails(this.MID).subscribe(data => {
        this.serviceData = data['Metadata']['Commands'];
        this.cache.updateDevice(data);
        this.updateEditSendCommandArguments();
      }, error => {
        this.loggerService.showErrorMessage("Getting device send commands failed!");
      });
    }
  }

  updateEditSendCommandArguments() : void {
    this.editSendCommands = [];
    this.serviceData.forEach((item, index) => {     
        if (this.serviceData[index]['Id'] == this.commandId) {
          this.commandName = this.serviceData[index]['Name'];
          if(item.Arguments != null){ 
          this.serviceData[index]['Arguments'].forEach((item, index) => {
            this.editing[index + '-Value'] = true;
            this.editSendCommands.push({
              Id: item['Id'],
              Name: item['Name'],
              Value: "",
              DataType: this.dataConversion.convertDataTypes(item['DataType'])
            });
          });
        }
      }
    });
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    this.editSendCommands[rowIndex][cell] = (row.DataType == dataTypes.Binary) || (row.DataType == dataTypes.Boolean) ? event.checked : event.target.value; 
  }

  onCheckEvent(event, cell, row, rowIndex) {
    this.editSendCommands[rowIndex][cell] = event;
  }

  validateTextInput(event, row) {
    if((event.key.toLowerCase() == "backspace" || event.key.toLowerCase() == "delete") || (event.ctrlKey && event.key.toLowerCase() == "v"))
      return true;

    if(!this.validateArgument(row.DataType,event.key)){
      event.preventDefault();
      return false;
    }
    else {
      return true;
    }
   }

   validateArgument(dataType : string,value : any): boolean { 
    let valid = false;
    switch(dataType) {     
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

  sendCommands() {
    this.today = new Date();
    this.editSendCommands.forEach(element => {
      if((element.DataType == dataTypes.Binary || element.DataType == dataTypes.Boolean) && element.Value == "")  {
        element.Value = false;
      }
    });
    this.requestObj = {
      Id: this.commandId,
      Timestamp: this.today.toISOString(),
      ExpiresAt: (this.commandTime == null) ? null : 
      new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate(), this.today.getHours(), this.today.getMinutes() + this.commandTime, this.today.getSeconds()).toISOString(),
      Arguments: this.editSendCommands.map((item) => ({ Id: item['Id'], Value: item['Value'] }))
    }
    this.deviceService.updateSendCommand(this.MID, this.commandId, this.requestObj).subscribe(data => {
      this.loggerService.showSuccessfulMessage("Updating device send commands success!");
      this.router.navigateByUrl('devices/' + this.MID + '/commands');
    }, error => {
      this.loggerService.showSuccessfulMessage("Updating device send commands failed!");
    });
  }

  refreshDeviceDetails() {
    sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
  }
  
}
