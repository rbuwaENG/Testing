import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs/internal/Observable';
import { startWith, map } from 'rxjs/operators';
import { dataTypes } from 'src/app/core/constants/dataType-names';
import { EnumerationGroupDetails } from 'src/app/core/interfaces/template-enumeration.interface';
import { QuantityItem, QuantityUnitOption } from '../../../core/interfaces/quantity-unit.interface';

export interface ObservationDetails {
  Id: number,
  Name: string,
  Description: string,
  DataType: number,
  Quantity: number,
  Unit: number,
  Historian: number
}

@Component({
  selector: 'app-observation-add-edit',
  templateUrl: './observation-add-edit.component.html',
  styleUrls: ['./observation-add-edit.component.scss']
})
export class ObservationAddEditComponent {

  addEditObservationForm: FormGroup;
  quantities: QuantityItem[];
  enumGroups: EnumerationGroupDetails[];
  title: any;
  observationDetails: ObservationDetails;
  quantityUnitOps: QuantityUnitOption[] = [];
  filteredQuanitiyUnitOps: Observable<QuantityUnitOption[]>;
  enumQuntityOption: QuantityUnitOption;

  historianTypes = [
    { "id": 0, "name": "All" },
    { "id": 1, "name": "None" },
    { "id": 2, "name": "Hourly Statistics" },
    { "id": 3, "name": "Daily Statistics" }
  ];
  dataTypes = [
    { "id": 1, "name": "Binary" },
    { "id": 2, "name": "Boolean" },
    { "id": 3, "name": "Double" },
    { "id": 4, "name": "Integer" },
    { "id": 5, "name": "Position" },
    { "id": 6, "name": "String" },
    { "id": 7, "name": "Statistics" }
  ];

  constructor(
    public dialogRef: MatDialogRef<ObservationAddEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder
  ) {
    this.enumQuntityOption = dataTypes.emptyEnumQuntityOption;
    this.initializeForm();
  }

  ngOnInit(): void {
    this.enumGroups = this.data['enumGroups'] as EnumerationGroupDetails[];
    this.quantities = this.data['units'] as QuantityItem[];
    this.quantityUnitOps = this._getQuanitityUnitOptions(this.quantities);

    if (this.data['obs'] == null) {
      this.title = "Add Observation";
      this.addEditObservationForm.get('QuantityUnit').disable();
    } else {
      this.observationDetails = this.data['obs'];
      this.title = `Update Observation - ${this.observationDetails.Name}`;
      this._toggleEnumGroupInUnitSelector(this.observationDetails.DataType);
      this.patchForm();
      this._toggleUnitSelector(this.observationDetails.DataType);
    }

    this.filteredQuanitiyUnitOps = this.addEditObservationForm.get('QuantityUnit')!.valueChanges.pipe(
      startWith(''),
      map(value => (value ? this._filterQuantitiesAndUnits(value) : this.quantityUnitOps.slice()))
    );
  }

  initializeForm() {
    this.addEditObservationForm = this.formBuilder.group({
      Id: new FormControl(this.data['obsRowId'], [Validators.required, this._duplicateIdValidator(this.data['observations'], this.data['obsRowId'])]),
      Name: new FormControl('', [Validators.required]),
      Description: new FormControl('', [Validators.required]),
      DataType: new FormControl('', [Validators.required]),
      Quantity: new FormControl('', [Validators.required]),
      Unit: new FormControl('', [Validators.required]),
      Historian: new FormControl(this.historianTypes[0].id, [Validators.required]),
      QuantityUnit: new FormControl(null, [Validators.required])
    });
  }

  patchForm() {
    this.addEditObservationForm.patchValue({
      Id: this.observationDetails.Id,
      Name: this.observationDetails.Name,
      Description: this.observationDetails.Description,
      DataType: this.observationDetails.DataType,
      Quantity: this.observationDetails.Quantity,
      Unit: this.observationDetails.Unit,
      Historian: this.observationDetails.Historian,
      QuantityUnit: this.quantityUnitOps.find(opt => opt.quantityId == this.observationDetails.Quantity && opt.unitId == this.observationDetails.Unit)
    });
  }

  displaySelectedOption(selectedoption: QuantityUnitOption) {
    if (typeof selectedoption === 'string') {
      //clear autocomplete control
      return '';
    }
    return (selectedoption) ? `${selectedoption.quantityName} | ${selectedoption.unitsName}` : 'N/A';
  }

  optionSeleted(event: any) {
    let selectedoption = event.option.value as QuantityUnitOption;
    this.addEditObservationForm.get('Quantity').setValue(selectedoption.quantityId);
    this.addEditObservationForm.get('Unit').setValue(selectedoption.unitId);
  }

  save() {
    this.dialogRef.close({
      data: this.addEditObservationForm.value
    })
  }

  onNoClick() {
    this.dialogRef.close({
      data: null
    });
  }

  onDataTypeChanged(dataType: number) {
    this._toggleUnitSelector(dataType);
    this._toggleEnumGroupInUnitSelector(dataType);
  }

  clearUnitValue() {
    this.addEditObservationForm.controls['QuantityUnit'].setValue('');
  }

  getClearBtnAvailability() {
    let dataTypeValue = this.addEditObservationForm.controls['DataType'].value;
    if (dataTypeValue == 3 || dataTypeValue == 4 || dataTypeValue == 7)
      return true;
    else
      return false;
  }

  private _duplicateIdValidator(observations: any, initialId: any): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || initialId == +control.value)
        return null;
      else {
        var matchId = observations?.find(s => s.Id == +control.value);
        if (matchId)
          return { duplicateId: true };
        else
          return null;
      }
    };
  }

  private _unitCtrlIdValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      else if (typeof control.value === 'string' || control.value instanceof String) {
        return { notMatch: true };
      }
      else {
        let filterValue = control.value as QuantityUnitOption;
        let pickedOrNot = this.quantityUnitOps.filter(opt => opt.quantityName.toLowerCase().includes(filterValue.quantityName) || opt.unitsName.toLowerCase().includes(filterValue.unitsName));
        if (pickedOrNot.length > 0) {
          return null;
        } else {
          return { notMatch: true };
        }
      }
    };
  }

  private _filterQuantitiesAndUnits(value: string): QuantityUnitOption[] {
    if (typeof value === 'string') {
      let filterValue = value?.toLowerCase();
      return this.quantityUnitOps.filter(opt => opt.quantityName.toLowerCase().includes(filterValue) || opt.unitsName.toLowerCase().includes(filterValue));
    }
    return [];
  }

  private _getQuanitityUnitOptions(quantities: QuantityItem[]) {
    let quantityUnitsOpts: QuantityUnitOption[] = [];
    quantities?.forEach(q => {
      let qId = q?.Id;
      let qName = q?.Name;
      q.Units?.forEach(u => {
        let uId = u?.Id;
        let uName = u?.Name;
        let option: QuantityUnitOption = {
          quantityId: qId,
          quantityName: qName,
          unitId: uId,
          unitsName: uName
        };
        quantityUnitsOpts.push(option);
      });
    });
    return quantityUnitsOpts;
  }

  private _toggleUnitSelector(dataType: number) {
    if (dataType !== 3 && dataType !== 4 && dataType !== 7) {
      this.addEditObservationForm.controls['Quantity'].setValue(0);
      this.addEditObservationForm.controls['Unit'].setValue(0);
      this.addEditObservationForm.controls['QuantityUnit'].setValue(null);
      this.addEditObservationForm.controls['QuantityUnit'].disable();
    } else {
      this.addEditObservationForm.controls['QuantityUnit'].enable();
    }
  }

  private _toggleEnumGroupInUnitSelector(dataType: number) {
    //add and remove enumgroups to units
    if (dataType === 4) {
      this.enumGroups?.forEach(enumGroup => {
        let enumOption = { ...this.enumQuntityOption };
        enumOption.unitId = enumGroup.Id;
        enumOption.unitsName = enumGroup.Name;
        this.quantityUnitOps.push(enumOption);
      });
    } else {
      let quantityOptionsWithoutEnums = this.quantityUnitOps.filter(opt => opt.quantityId != this.enumQuntityOption.quantityId);
      this.quantityUnitOps = [...quantityOptionsWithoutEnums];
      //if already selected unit is enum remove it
      let selectedQuantityValue = +this.addEditObservationForm.get('Quantity').value;
      if (selectedQuantityValue == this.enumQuntityOption.quantityId) {
        this.addEditObservationForm.controls['Quantity'].setValue(0);
        this.addEditObservationForm.controls['Unit'].setValue(0);
        this.addEditObservationForm.controls['QuantityUnit'].setValue(null);
      }
    }
  }
}
