import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageKeys } from 'src/app/core/constants';
import { DialogsService, LoggerService, TemplateService } from 'src/app/services';
import { DashboardService } from 'src/app/services/dashboard.service';
import { TemplateDashboard } from 'src/app/core/models/dashboard/template-dashboard'
import { DashboardObservation, DashboardPlacement, DashboardTimespan } from 'src/app/core/models/dashboard/dashboard-observation';
import { forkJoin, Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TemplateDashboaardPreviewPopupComponent } from '../template-dashboaard-preview-popup/template-dashboaard-preview-popup.component';

export interface TemplateDashboardDetails {
  Id: string,
  Name: string,
  Index: number,
  Columns: number,
  Rows: number,
  IsLive: boolean
}

export interface DefinitionDetails {
  Id: number,
  Timespan: string,
  ControlType: string
}

@Component({
  selector: 'app-template-dashboard-add-edit',
  templateUrl: './template-dashboard-add-edit.component.html',
  styleUrls: ['./template-dashboard-add-edit.component.scss']
})
export class TemplateDashboardAddEditComponent implements OnInit {

  TID: any;
  dashboardId: any;
  selectedTemplate: any;
  selectedObservations: any = [];
  selectedTemplateObservations: any;
  isEdit: boolean = true;
  selectedDashboard: TemplateDashboardDetails;
  addEditDashboardForm: FormGroup;
  title: any;
  editing = {};

  controlTypes = [
    { "id": 0, "name": "Table" },
    { "id": 1, "name": "Plot" },
    { "id": 2, "name": "Map" }
  ];
  timeRanges = [
    { "id": 1, "name": "Seconds" },
    { "id": 2, "name": "Minutes" },
    { "id": 3, "name": "Hours" },
    { "id": 4, "name": "Days" },
    { "id": 5, "name": "Months" },
    { "id": 6, "name": "Years" }
  ];

  constructor(
    private loggerService: LoggerService,
    private router: Router,
    private route: ActivatedRoute,
    private templateService: TemplateService,
    private formBuilder: FormBuilder,
    private dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private dashboardService: DashboardService,
    public dialog: MatDialog
  ) {
    this.TID = this.route.snapshot.params['templateId'];
    this.dashboardId = this.route.snapshot.params['dashboardId'];
    if (this.route.snapshot.params['type']) {
      this.isEdit = false;
    }
    this.initializeForm();
  }

  ngOnInit(): void {
    this.selectedObservations = [];
    this.title = "Create";
    if (this.isEdit) {
      this.title = "Update";
    }
    this.initializeData();
  }

  private initializeData() {
    let allTemplates = this.templateService.getTemplates();
    let allDashboards = this.dashboardService.getAllTemplateDashboards(this.TID);

    forkJoin([allTemplates, allDashboards]).subscribe((data: any) => {
      let templateList = data[0];
      let listOfDashboards = data[1];

      this.selectedTemplate = templateList.find(t => t.Id == this.TID);
      if (!this.selectedTemplate)
        return this.loggerService.showErrorMessage('Selected template details cannot be found.');

      this.selectedTemplateObservations = this.selectedTemplate['Observations'];
      if (this.isEdit) {
        this.selectedDashboard = listOfDashboards.find(d => d.Id == this.dashboardId);
        this.patchForm();
        this.populateObservations();
      }
    });
  }

  private initializeForm() {
    this.addEditDashboardForm = this.formBuilder.group({
      Name: new FormControl('', [Validators.required]),
      Index: new FormControl('', [Validators.required]),
      Columns: new FormControl('', [Validators.required]),
      Rows: new FormControl('', [Validators.required]),
      IsLive: new FormControl(false)
    });
  }

  private patchForm() {
    this.addEditDashboardForm.patchValue({
      Id: this.selectedDashboard.Id,
      Name: this.selectedDashboard.Name,
      Index: this.selectedDashboard.Index,
      Columns: this.selectedDashboard.Columns,
      Rows: this.selectedDashboard.Rows,
      IsLive: this.selectedDashboard.IsLive
    });
  }

  addObservations() {
    let dashboardObv = {
      Id: this.selectedTemplateObservations[0]?.Id,
      ObsId: this.selectedTemplateObservations[0]?.Id,
      ObservationName: this.selectedTemplateObservations[0]?.Name,
      ControlType: 0,
      Timespan: {
        Duration: 120,
        Resolution: 1
      },
      Placement: {
        Column: 1,
        Row: 1,
        ColumnSpan: 1,
        RowSpan: 1
      }
    };
    this.selectedObservations.push(dashboardObv);
    this.selectedObservations = [...this.selectedObservations];
    this.editing[this.selectedObservations.length - 1 + '-cell'] = true;
  }

  saveDashboard() {
    let dashboardObservationDetails: DashboardObservation[] = [];

    if (this.selectedObservations.length > 0) {
      this.selectedObservations.forEach(selectedObservation => {
        let timespanObject = new DashboardTimespan(
          +selectedObservation.Timespan.Duration,
          +selectedObservation.Timespan.Resolution);
        let dashboardPlacementObject = new DashboardPlacement(
          +selectedObservation.Placement.Column, +selectedObservation.Placement.Row,
          +selectedObservation.Placement.ColumnSpan, +selectedObservation.Placement.RowSpan);
        let obser = new DashboardObservation(
          +selectedObservation.ObsId,
          timespanObject,
          +selectedObservation.ControlType,
          dashboardPlacementObject);
        dashboardObservationDetails.push(obser);
      });
    }

    let dashboardObject = new TemplateDashboard(
      (this.isEdit) ? this.dashboardId : '',
      this.addEditDashboardForm.value.Name,
      this.addEditDashboardForm.value.Index,
      this.addEditDashboardForm.value.Rows,
      this.addEditDashboardForm.value.Columns,
      this.addEditDashboardForm.value.IsLive,
      dashboardObservationDetails
    );
    if (this.dashboardId) {
      this.updateDashboard(this.TID, this.dashboardId, dashboardObject);
    }
    else {
      this.createDashboard(this.TID, dashboardObject);
    }
  }

  private createDashboard(tId: string, dashboardObj: TemplateDashboard) {
    this.dashboardService.createTemplateDashboard(tId, dashboardObj)
      .subscribe(data => {
        this.loggerService.showSuccessfulMessage('Dashboard created successfully.');
        this.router.navigateByUrl(`templates/${tId}/dashboards`);
      }, error => {
        if (error.status == 200) { // return 200OK but send an error responce also investigate the issue
          this.loggerService.showSuccessfulMessage('Dashboard created successfully.');
          this.router.navigateByUrl(`templates/${tId}/dashboards`);
          return;
        }
        this.loggerService.showErrorMessage('Dashboard creation faild.');
      });
  }

  private updateDashboard(tId: string, dId: string, dashboardObj: TemplateDashboard) {
    this.dashboardService.updateTemplateDashboard(tId, dId, dashboardObj)
      .subscribe(data => {
        this.loggerService.showSuccessfulMessage('Dashboard updated successfully.');
        this.router.navigateByUrl(`templates/${tId}/dashboards`);
      }, error => {
        if (error.status == 200) { // return 200OK but send an error responce also investigate the issue
          this.loggerService.showSuccessfulMessage('Dashboard updated successfully.');
          this.router.navigateByUrl(`templates/${tId}/dashboards`);
          return;
        }
        this.loggerService.showErrorMessage('Dashboard update faild.');
      });
  }

  deleteObservation(observation, observationRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the observation?',
        true,
        this.viewContainerRef
      )
      .subscribe(res => {
        if (res == true) {
          this.selectedObservations.splice(observationRow, 1);
        }
      });
  }

  onNoClick() {
    this.router.navigateByUrl(`templates/${this.TID}/dashboards`);
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    this.editing[rowIndex + '-' + cell] = false;
    if (cell == 'Timespan.Duration')
      this.selectedObservations[rowIndex]["Timespan"]["Duration"] = +event.target.value;
    else if (cell == 'Timespan.Resolution')
      this.selectedObservations[rowIndex]["Timespan"]["Resolution"] = +event.target.value;
    else if (cell == 'Placement.Column') {
      if ((+event.target.value) <= this.addEditDashboardForm.value.Columns) {
        this.addEditDashboardForm.setErrors({ "invalid-grid": false });
        this.addEditDashboardForm.updateValueAndValidity();
        this.selectedObservations[rowIndex]["Placement"]["Column"] = +event.target.value;
      }
      else {
        this.addEditDashboardForm.setErrors({ "invalid-grid": true });
        this.loggerService.showErrorMessage('Column number should be less than number columns in the grid');
      }
    }
    else if (cell == 'Placement.Row') {
      if ((+event.target.value) <= this.addEditDashboardForm.value.Rows) {
        this.addEditDashboardForm.setErrors({ "invalid-grid": false });
        this.addEditDashboardForm.updateValueAndValidity();
        this.selectedObservations[rowIndex]["Placement"]["Row"] = +event.target.value;
      }
      else {
        this.addEditDashboardForm.setErrors({ "invalid-grid": true });
        this.loggerService.showErrorMessage('Row number should be less than number row in the grid');
      }
    }
    else if (cell == 'Placement.ColumnSpan') {
      if ((+row.Placement.Column + (+event.target.value) - 1) <= this.addEditDashboardForm.value.Columns) {
        this.addEditDashboardForm.setErrors({ "invalid-grid": false });
        this.addEditDashboardForm.updateValueAndValidity();
        this.selectedObservations[rowIndex]["Placement"]["ColumnSpan"] = +event.target.value;
      }
      else {
        this.addEditDashboardForm.setErrors({ "invalid-grid": true });
        this.loggerService.showErrorMessage('Column span should be with in the grid');
      }
    }
    else if (cell == 'Placement.RowSpan') {
      if ((+row.Placement.Row + (+event.target.value) - 1) <= this.addEditDashboardForm.value.Rows) {
        this.addEditDashboardForm.setErrors({ "invalid-grid": false });
        this.addEditDashboardForm.updateValueAndValidity();
        this.selectedObservations[rowIndex]["Placement"]["RowSpan"] = +event.target.value;
      }
      else {
        this.addEditDashboardForm.setErrors({ "invalid-grid": true });
        this.loggerService.showErrorMessage('Row span should be with in the grid');
      }
    }
    else if (cell == 'ObsId') {
      this.selectedObservations[rowIndex]['Id'] = +event.target.value;
      this.selectedObservations[rowIndex][cell] = +event.target.value;
      this.selectedObservations[rowIndex]['ObservationName'] = this.selectedTemplateObservations.find(o => o.Id == +event.target.value)?.Name;
    }
    else {
      this.selectedObservations[rowIndex][cell] = event.target.value;
    }
  }

  private getTemplateList(): Observable<any> {
    let templateList = JSON.parse(localStorage.getItem(LocalStorageKeys.CACHED_TEMPLATES));
    if (templateList)
      return new Observable<any>((subscriber) => { subscriber.next(templateList); });
    else
      return this.templateService.getTemplates();
  }

  private populateObservations() {
    this.selectedObservations = this.selectedDashboard['Observations'];
    this.selectedObservations = this.selectedObservations.map(a => {
      const exists = this.selectedTemplateObservations.find(b => a.Id == b.Id);
      if (exists) {
        a.ObsId = exists.Id;
        a.ObservationName = exists.Name;
        a.ControlType = a.Widget;
      }
      return a;
    });
    this.selectedObservations = this.selectedObservations.sort((a, b) => (a.Name < b.Name ? 1 : 1));
  }

  scrollDown() {
    let element = document.querySelector('#observations');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }

  previewClick() {
    this.dialog.open(TemplateDashboaardPreviewPopupComponent, {
      data: {
        columns: this.addEditDashboardForm.value.Columns,
        observations: this.selectedObservations
      }
    });
  }
}
