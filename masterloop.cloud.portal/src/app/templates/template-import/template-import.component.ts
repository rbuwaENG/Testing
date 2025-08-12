import { Component, Inject, NgZone, OnInit } from '@angular/core';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DiffResults } from 'ngx-text-diff/lib/ngx-text-diff.model';
import { ImportData } from 'src/app/core/models';
import { LoggerService, TemplateService } from 'src/app/services';

interface DialogData {
  MID: string;
}

@Component({
  selector: 'app-template-import',
  templateUrl: './template-import.component.html',
  styleUrls: ['./template-import.component.scss'],
})
export class TemplateImportComponent implements OnInit {
  selectedFile: File;
  isContentReady: boolean = false;
  left: any;
  right: any;
  MID: any;
  TIDS: any = [];
  template: any;
  replaceTemplate: any;
  isTwoObjetsAreDifferent: boolean = false;
  importByFile: boolean = false;
  importByTemplate: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<TemplateImportComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private loggerService: LoggerService,
    public dialog: MatDialog,
    private templateService: TemplateService,
    private zone: NgZone
  ) {
    this.MID = this.data['selectedTID'];
    setTimeout(() => {
      this.zone.run(
        () => this.setDetails()
        // this.close()
      );
    });
  }
  setDetails() {
    if (typeof this.data != 'undefined' || this.data != null) {
      //console.log(this.data);
      this.MID = this.data['selectedTID'];
      this.getAllTemplates();
      this.getCurrentDeviceTemplateObject();
    }
  }

  importOptionChange(event) {
    if (event.value != null) {
      this.isContentReady = false;
      if (event.value == '1') {
        this.importByFile = true;
        this.importByTemplate = false;
      } else {
        this.importByFile = false;
        this.importByTemplate = true;
      }
    }
  }

  ngOnInit(): void {
    this.left = '';
    this.right = '';
    //this.TIDS = ['SLDEVTE10', 'SLDEVTE3', 'AMGENCAR', 'SLDEVTE4'];
  }
  getAllTemplates() {
    this.templateService.getTemplates().subscribe(
      (data) => {
        //console.log(data);
        // data.sort((a: any, b: any) =>
        //   a.Id.localeCompare(b.Id)
        // );
        const selectedIds = data.map(({ Id }) => Id);
        selectedIds.sort((a: any, b: any) => a.localeCompare(b));

        this.TIDS = selectedIds;

        //console.log(this.TIDS);
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting all templates failed!');
      }
    );
  }
  onTypeChange(event) {
    //console.log(event);
    this.right = '';
    this.isContentReady = false;
    if (event.value != null) {
      this.templateService.getTemplateDetails(event.value).subscribe(
        (data) => {
          this.replaceTemplate = data;
          this.isContentReady = true;
          this.right = JSON.stringify(data, null, 4);
          //this.left = JSON.stringify(data, null, "\t");
        },
        (error) => {
          this.loggerService.showErrorMessage(
            'Getting template details failed!'
          );
        }
      );
    }
  }

  getCurrentDeviceTemplateObject() {
    this.templateService.getTemplateDetails(this.MID).subscribe(
      (data) => {
        //console.log(data);
        this.template = data;
        this.left = JSON.stringify(data, null, 4);
        //this.left = JSON.stringify(data, null, "\t");
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting template details failed!');
      }
    );
  }

  updateTemplate() {
    if (this.isTwoObjetsAreDifferent) {
      this.replaceTemplate.Id = this.template.Id;
      this.replaceTemplate.Name = this.template.Name;
      this.replaceTemplate.Description = this.template.Description;
      this.replaceTemplate.Revision = this.template.Revision;
      this.replaceTemplate.Protocol = this.template.Protocol;
      this.templateService
        .updateTemplate(this.template.Id, this.replaceTemplate)
        .subscribe((data) => {
          if (data == null) {
            this.loggerService.showSuccessfulMessage(
              'Template successfully imported!'
            );
            this.isContentReady = false;
            this.left = '';
            this.right = '';
            this.dialogRef.close('imported');
          } else {
            this.loggerService.showErrorMessage('Template import failed!');
          }
        });
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  changeListener($event): void {
    this.selectedFile = $event.target.files[0];
    var extension = $event.target.files[0].name.split('.').pop().toLowerCase();
    if (extension == 'json') {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        this.isContentReady = true;
        let val = fileReader.result;
        let data: ImportData = JSON.parse(fileReader.result.toString());
        this.replaceTemplate = data;
        this.right = JSON.stringify(data, null, 4);
      };
      fileReader.readAsText(this.selectedFile);
      fileReader.onerror = (error) => {
        this.loggerService.showErrorMessage(
          'Something went wrong. Please try again!'
        );
        return;
      };
    } else {
      this.loggerService.showErrorMessage(
        'Incorrect file format selected. ".json" only!'
      );
      return;
    }
  }

  onCompareResults(diffResults: DiffResults) {
    this.isTwoObjetsAreDifferent = diffResults.hasDiff;
  }
}
