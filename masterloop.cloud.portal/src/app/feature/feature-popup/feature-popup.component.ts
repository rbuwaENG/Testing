import { Component, Inject, Input, OnInit } from '@angular/core';
import { AddOnFeature } from 'src/app/core/enums/add-on-feature.enum';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-feature-popup',
  templateUrl: './feature-popup.component.html',
  styleUrls: ['./feature-popup.component.scss']
})
export class FeaturePopupComponent implements OnInit {

  featureName!: string
  constructor(@Inject(MAT_DIALOG_DATA) public data: { addOnFeature: AddOnFeature }, public dialogRef: MatDialogRef<FeaturePopupComponent>) { }

  ngOnInit(): void {
    switch (this.data.addOnFeature) {
      case AddOnFeature.Firmware:
        this.featureName = "Firmware";
        break;
      case AddOnFeature.Dashboard:
        this.featureName = "Dashboard";
        break;
      default:
        this.featureName = "";
        break;
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
