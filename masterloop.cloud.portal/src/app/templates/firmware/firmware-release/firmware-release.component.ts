import { Component, OnInit } from '@angular/core';
// import { FileUploader } from 'ng2-file-upload';
import { TemplateService } from '../../../services/template.service';
import { LoggerService } from '../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-firmware-release',
  templateUrl: './firmware-release.component.html',
  styleUrls: ['./firmware-release.component.scss']
})
export class FirmwareReleaseComponent implements OnInit {
  TID: string;
  version: string;
  newVersion: string;
  firmwareRelese = {};
  firmwareDetails = {};
  public fileString;
  fileSize;
  versionStatus = true;
  public form: FormGroup;

  constructor(
    private templateService: TemplateService,
    private loggerService: LoggerService,
    route: ActivatedRoute,
    private router: Router
  ) {
    this.TID = route.snapshot.params['templateId'];
    this.fileString;
  }

  ngOnInit() {
    this.buildForm();
    this.templateService.getFirmwareDetails(this.TID).subscribe(
      data => {
        if(data != null) {
          this.firmwareDetails = data;
          this.version = data['VersionNo'];
          this.buildForm();
  
          if (data.status == 204) {
            this.versionStatus = false;
          }
        }
        
      },
      error => {
        this.loggerService.showErrorMessage('Getting firmware details failed!');
      }
    );
  }

  private buildForm() {
    this.form = new FormGroup({
      newVersion: new FormControl(this.version, [
        Validators.required
      ])
    });
  }

  changeListener($event): void {
    this.readThis($event.target);
  }

  readThis(inputValue: any): void {
    var file: File = inputValue.files[0];
    var fileReader: FileReader = new FileReader();
    var fileType = inputValue.parentElement.id;

    fileReader.onloadend = e => {
      this.fileString = fileReader.result
        .toString()
        .split(',')
        .pop();
      this.dataURItoBlob(fileReader.result);
    };
    fileReader.readAsDataURL(file);
  }

  createFirmwareRelease() {
    if (this.newVersion != null || typeof this.newVersion != 'undefined') {
      if (this.fileSize != null || typeof this.fileSize != 'undefined') {
        this.firmwareRelese = {
          DeviceTemplateId: this.TID,
          VersionNo: this.newVersion,
          BlobSize: this.fileSize,
          BlobData: this.fileString
        };
        this.templateService
          .creatfirmwareRelease(this.firmwareRelese)
          .subscribe(
            data => {
              this.loggerService.showSuccessfulMessage(
                'Uploading firmaware file success'
              );
              this.router.navigateByUrl('templates/details/view/' + this.TID);
            },
            error => {
              this.loggerService.showErrorMessage(
                'Uploading firmaware file failed!'
              );
            }
          );
      } else {
        this.loggerService.showErrorMessage('Please select a file to upload.');
      }
    } else {
      this.loggerService.showErrorMessage('Please update the version number.');
    }
  }

  dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI
      .split(',')[0]
      .split(':')[1]
      .split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    // write the ArrayBuffer to a blob.
    var fileBlob = new Blob([ab], { type: mimeString });

    //get the size of the blob
    this.fileSize = fileBlob.size;
  }
}
