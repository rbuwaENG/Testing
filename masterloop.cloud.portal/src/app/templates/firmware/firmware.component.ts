import { Component, OnInit, Input } from '@angular/core';
import { TemplateService } from '../../services/template.service';
import { LoggerService } from '../../services/logger.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-firmware',
  templateUrl: './firmware.component.html',
  styleUrls: ['./firmware.component.scss']
})
export class FirmwareComponent implements OnInit {
  @Input() data: string;
  firmwareDetails = [];
  currentFirmware = {};
  serviceDataAvilable = false;
  releaseIds = [];
  selectedReleaseId: any;
  currentFirmwareReleaseId;

  constructor(
    private templateService: TemplateService,
    private loggerService: LoggerService
  ) {}

  ngOnInit() {
    console.log(this.data);
    forkJoin(
      this.templateService.getFirmwareDetails(this.data),
      this.templateService.getCurrentFirmwareDetails(this.data)
    )
      .pipe(
        map(data => {
          console.log(data);
          return {
            firmwares: data[0],
            currentFirmware: data[1]
          };
        })
      )
      .subscribe(
        data => {
          if(data['firmwares'] != null) {
            if (data['firmwares']['status'] != 204) {
              this.serviceDataAvilable = true;
              this.firmwareDetails = data['firmwares'];  
              
              if(data['currentFirmware'] != null) {
                if (data['currentFirmware']['status'] != 204) {
                  this.currentFirmwareReleaseId = data['currentFirmware']['Id'];
                  this.currentFirmware = data['currentFirmware'];
                  this.selectedReleaseId = this.currentFirmwareReleaseId;
                  this.arrangeReleaseIds();
                }
              }
               else {
                this.releaseIds = [];
                this.firmwareDetails.forEach(firmWare => {
                  let firmWareData = [];
                  firmWareData['id'] = firmWare['Id'];
                  firmWareData[
                    'value'
                  ] = `${firmWare['Id']} (${firmWare['ReleaseDate']})`;
                  firmWareData['selected'] = 1;
                  this.releaseIds.push(firmWareData);
                });
                this.selectedReleaseId = data['firmwares'][0]['Id'];
                this.currentFirmware = data['firmwares'][0];
              }
            }
          }
          
        },
        error => {
          this.loggerService.showErrorMessage(
            'Getting firmware details failed!'
          );
        }
      );
  }

  arrangeReleaseIds() {
    this.releaseIds = [];
    this.firmwareDetails.forEach(firmWare => {
      let firmWareData = [];
      if (firmWare.Id == this.currentFirmwareReleaseId) {
        var date = new Date(firmWare.ReleaseDate).toISOString().slice(0, 19);
        firmWareData['id'] = firmWare.Id;
        firmWareData['value'] = `${firmWare.Id}     (${date})-Current`;
        firmWareData['selected'] = 1;
        this.releaseIds.push(firmWareData);
      } else {
        var date = new Date(firmWare.ReleaseDate).toISOString().slice(0, 19);
        firmWareData['id'] = firmWare.Id;
        firmWareData['value'] = `${firmWare.Id}   (${date})`;
        firmWareData['selected'] = 0;
        this.releaseIds.push(firmWareData);
      }
    });
  }

  setCurrent() {
    if (this.selectedReleaseId != null) {
      this.templateService
        .setCurrentFirmWare(this.data, this.selectedReleaseId)
        .subscribe(
          data => {
              this.loggerService.showSuccessfulMessage(
                'Current firmware updated successfully!'
              );
              this.ngOnInit();
          },
          error => {
            this.loggerService.showErrorMessage(
              'Setting current firmware failed!'
            );
          }
        );
    }
  }
}
