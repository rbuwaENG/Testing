import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

interface Condition {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-filter-dialog',
  templateUrl: './filter-dialog.component.html',
  styleUrls: ['./filter-dialog.component.scss'],
})
export class FilterDialogComponent implements OnInit {
  form: FormGroup;

  defaultConditions: Condition[] = [
    { value: 'equal', viewValue: '=' },
    { value: 'less', viewValue: '<' },
    { value: 'greater', viewValue: '>' },
    { value: 'lessEqual', viewValue: '<=' },
    { value: 'greaterEqual', viewValue: '>=' },
  ];
  conditions: Condition[] = [];

  @Input() observation: any;
  data: any;
  showBoolean: boolean = false;

  constructor(private dialogRef: MatDialogRef<FilterDialogComponent>) {}

  ngOnInit(): void {
    this.setForm();
    if (this.observation.DataType == 'String') {
      this.conditions = [{ value: 'equal', viewValue: '=' }];
    } else if (this.observation.DataType == 'Boolean') {
      this.conditions = [{ value: 'equal', viewValue: '=' }];
      this.showBoolean = true;
    } else if (this.observation.DataType == 'Integer') {
      this.conditions = this.defaultConditions;
    } else {
      this.conditions = this.defaultConditions;
    }
  }

  close() {
    this.dialogRef.close();
  }

  clearFilter() {
    this.form.reset(this.form.value);
    let data = this.form.value;
    data.ObservationId = this.observation.Id;
    data.SetFilter = false;
    this.dialogRef.close(data);
  }

  setForm() {
    this.form = new FormGroup({
      Condition: new FormControl(this.observation.Condition, [
        Validators.required,
      ]),
      Value: new FormControl(this.observation.Value, [Validators.required]),
    });
  }

  setFilter() {
    let data = this.form.value;
    data.ObservationId = this.observation.Id;
    data.SetFilter = true;

    this.dialogRef.close(data);
  }
}
