import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-template-dashboaard-preview-popup',
  templateUrl: './template-dashboaard-preview-popup.component.html',
  styleUrls: ['./template-dashboaard-preview-popup.component.scss']
})
export class TemplateDashboaardPreviewPopupComponent implements OnInit {

  readonly tableGridColour: string = 'lightpink';
  readonly plotGridColour: string = 'lightblue';
  readonly mapGridColour: string = 'lightgreen';

  readonly controlTypes = [
    { "id": 0, "name": "Table" },
    { "id": 1, "name": "Plot" },
    { "id": 2, "name": "Map" }
  ];

  columns: number = 0;
  observations: any[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<TemplateDashboaardPreviewPopupComponent>) { }

  ngOnInit(): void {
    this.columns = this.data?.columns;
    this.observations = this.data?.observations;
    this.observations.sort(function (a, b) {
      if (a["Placement"]['Row'] > b["Placement"]['Row']) { return 1; }
      if (a["Placement"]['Row'] < b["Placement"]['Row']) { return -1; }
      if (a["Placement"]['Column'] > b["Placement"]['Column']) { return 1; }
      if (a["Placement"]['Column'] < b["Placement"]['Column']) { return -1; }
      return 0;
    });
  }

  getGridBackgroundColour(controlType: number): string {
    if (controlType == 0)
      return this.tableGridColour;
    else if (controlType == 1)
      return this.plotGridColour;
    else if (controlType == 2)
      return this.mapGridColour;
    else
      return 'white';
  }

  getGridTypeText(controlType: number): string {
    return this.controlTypes.find(c=> c.id == controlType)?.name;
  }
}
