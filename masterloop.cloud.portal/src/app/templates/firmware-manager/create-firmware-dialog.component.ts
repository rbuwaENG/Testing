import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoggerService, TemplateService } from 'src/app/services';

export interface DialogData {
  TID: string;
  variantId: number;
}

@Component({
  selector: 'create-firmware-dialog',
  template: ` <div>
      <p class="create-firmware-title">
        You are ready to upload firmware Template Id :
        <span>{{ data.TID }}</span> Variant Id :
        <span>{{ data.variantId }}</span>
      </p>
      <mat-form-field [style.width.px]="250">
        <mat-label>New Version No</mat-label>
        <input
          matInput
          id="newVersion"
          [(ngModel)]="newVersion"
          required
          [formControl]="form.controls['newVersion']"
        />
        <mat-error
          *ngIf="
            form.controls['newVersion'].hasError('required') &&
            form.controls['newVersion'].touched
          "
          class="mat-text-warn"
          >You must include a new version.</mat-error
        >
      </mat-form-field>

      <input
        type="file"
        class="firmware-upload-btn"
        (change)="changeListener($event)"
      />
    </div>
    <div mat-dialog-actions>
      <button mat-raised-button color="white" mat-button (click)="onNoClick()">
        Cancel
      </button>
      <button
        mat-raised-button
        color="primary"
        mat-button
        [disabled]="!form.valid"
        [mat-dialog-close]="data.variantId"
        cdkFocusInitial
        (click)="createFirmwareRelease()"
      >
        Upload & Create
      </button>
    </div>`,
  styles: ['.firmware-upload { width: 300px;}'],
})
export class CreateFirmwareDialog implements OnInit {
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
    public dialogRef: MatDialogRef<CreateFirmwareDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private loggerService: LoggerService,
    public dialog: MatDialog,
    private templateService: TemplateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.buildForm();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  createFirmwareRelease() {
    if (this.newVersion != null || typeof this.newVersion != 'undefined') {
      if (this.fileSize != null || typeof this.fileSize != 'undefined') {
        this.firmwareRelese = {
          DeviceTemplateId: this.data.TID,
          VariantId: this.data.variantId,
          VersionNo: this.newVersion,
          BlobSize: this.fileSize,
          BlobData: this.fileString,
        };
        this.templateService
          .creatfirmwareRelease(this.firmwareRelese)
          .subscribe(
            (data) => {
              this.loggerService.showSuccessfulMessage(
                'Uploading firmaware file success'
              );
              this.dialogRef.close({ event: 'Add' });
            },
            (error) => {
              this.loggerService.showErrorMessage(
                'Uploading firmaware file failed!'
              );
            }
          );
      } else {
        this.loggerService.showErrorMessage('Please select a file to upload.');
        this.openDialog();
      }
    } else {
      this.loggerService.showErrorMessage('Please update the version number.');
      this.openDialog();
    }
  }

  openDialog() {
    const dialogRef = this.dialog.open(CreateFirmwareDialog, {
      width: '300px',
      minHeight: '280px',
      data: { TID: this.data.TID, variantId: this.data.variantId },
    });
  }

  changeListener($event): void {
    this.readThis($event.target);
  }

  readThis(inputValue: any): void {
    var file: File = inputValue.files[0];
    var fileReader: FileReader = new FileReader();
    var fileType = inputValue.parentElement.id;

    fileReader.onloadend = (e) => {
      this.fileString = fileReader.result.toString().split(',').pop();
      this.dataURItoBlob(fileReader.result);
    };
    fileReader.readAsDataURL(file);
  }

  dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

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

  private buildForm() {
    this.form = new FormGroup({
      newVersion: new FormControl(this.version, [Validators.required]),
      file: new FormControl(''),
    });
  }
}
