import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs/internal/Observable';
import { startWith, map } from 'rxjs/operators';
import { dataTypes } from 'src/app/core/constants/dataType-names';
import { EnumerationGroupDetails, EnumerationItem } from 'src/app/core/interfaces/template-enumeration.interface';
import { QuantityItem, QuantityUnitOption } from '../../../core/interfaces/quantity-unit.interface';
import { TemplateSetting } from '../../../core/interfaces/template-setting.interface';

@Component({
  selector: 'app-setting-add-edit',
  templateUrl: './setting-add-edit.component.html',
  styleUrls: ['./setting-add-edit.component.scss']
})
export class SettingAddEditComponent implements OnInit {

  addEditSettingForm: FormGroup;
  quantities: QuantityItem[];
  enumGroups: EnumerationGroupDetails[];
  title: any;
  settingDetails: TemplateSetting;
  quantityUnitOps: QuantityUnitOption[] = [];
  filteredQuanitiyUnitOps: Observable<QuantityUnitOption[]>;
  enumQuntityOption: QuantityUnitOption;
  enumItemsOfSelectedEnumGroup: EnumerationItem[] = [];
  showEnumItemsInDefaultValue: boolean = false;

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
    public dialogRef: MatDialogRef<SettingAddEditComponent>,
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

    if (this.data['sett'] == null) {
      this.title = "Add Setting";
      this.addEditSettingForm.get('QuantityUnit').disable();
    } else {
      this.settingDetails = this.data['sett'];
      this.title = `Update Setting - ${this.settingDetails.Name}`;
      this._toggleEnumGroupInUnitSelector(this.settingDetails.DataType);
      this.patchForm();
      this._toggleUnitSelector(this.settingDetails.DataType);
      this._toggleDefaultValueSelectorToEnumItems(this.settingDetails.Quantity, this.settingDetails.Unit, true);
    }
    this._dynamicDefaultValidator();

    this.filteredQuanitiyUnitOps = this.addEditSettingForm.get('QuantityUnit')!.valueChanges.pipe(
      startWith(''),
      map(value => (value ? this._filterQuantitiesAndUnits(value) : this.quantityUnitOps.slice()))
    );
  }

  initializeForm() {
    this.addEditSettingForm = this.formBuilder.group({
      Id: new FormControl(this.data['settRowId'], [Validators.required, this._duplicateIdValidator(this.data['settings'], this.data['settRowId'])]),
      Name: new FormControl('', [Validators.required]),
      Description: new FormControl('', [Validators.required]),
      DataType: new FormControl('', [Validators.required]),
      Quantity: new FormControl('', [Validators.required]),
      Unit: new FormControl('', [Validators.required]),
      DefaultValue: new FormControl(''),
      QuantityUnit: new FormControl(null, [Validators.required])
    });
  }

  patchForm() {
    this.addEditSettingForm.patchValue({
      Id: this.settingDetails.Id,
      Name: this.settingDetails.Name,
      Description: this.settingDetails.Description,
      DataType: this.settingDetails.DataType,
      Quantity: this.settingDetails.Quantity,
      Unit: this.settingDetails.Unit,
      DefaultValue: this.settingDetails.DefaultValue,
      QuantityUnit: this.quantityUnitOps.find(opt => opt.quantityId == this.settingDetails.Quantity && opt.unitId == this.settingDetails.Unit)
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
    this.addEditSettingForm.get('Quantity').setValue(selectedoption.quantityId);
    this.addEditSettingForm.get('Unit').setValue(selectedoption.unitId);

    //set default settings values if quantity is enum
    this._toggleDefaultValueSelectorToEnumItems(selectedoption.quantityId, selectedoption.unitId);
  }

  save() {
    this.dialogRef.close({
      data: this.addEditSettingForm.value
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
    this._dynamicDefaultValidator();
  }

  clearUnitValue() {
    this.addEditSettingForm.controls['QuantityUnit'].setValue('');
  }

  getClearBtnAvailability() {
    let dataTypeValue = this.addEditSettingForm.controls['DataType'].value;
    if (dataTypeValue == 3 || dataTypeValue == 4 || dataTypeValue == 7)
      return true;
    else
      return false;
  }

  convertValueToString(value: number): string {
    return `${value}`;
  }

  private _duplicateIdValidator(settings: any, initialId: any): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || initialId == +control.value)
        return null;
      else {
        var matchId = settings?.find(s => s.Id == +control.value);
        if (matchId)
          return { duplicateId: true };
        else
          return null;
      }
    };
  }

  private _dynamicDefaultValidator() {
    if (this.addEditSettingForm.get('DataType').value !== 6) {
      this.addEditSettingForm.get('DefaultValue').setValidators(Validators.required);
      this.addEditSettingForm.controls["DefaultValue"].updateValueAndValidity();
    }
    else {
      this.addEditSettingForm.get('DefaultValue').clearValidators();
      this.addEditSettingForm.controls["DefaultValue"].updateValueAndValidity();
    }
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
      this.addEditSettingForm.controls['Quantity'].setValue(0);
      this.addEditSettingForm.controls['Unit'].setValue(0);
      this.addEditSettingForm.controls['QuantityUnit'].setValue(null);
      this.addEditSettingForm.controls['QuantityUnit'].disable();
    } else {
      this.addEditSettingForm.controls['QuantityUnit'].enable();
    }
  }

  private _toggleEnumGroupInUnitSelector(dataType: number) {

    let selectedQuantityValue = +this.addEditSettingForm.get('Quantity').value;
    let selectedUnitValue = +this.addEditSettingForm.get('Unit').value;

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
      if (selectedQuantityValue == this.enumQuntityOption.quantityId) {
        this.addEditSettingForm.controls['Quantity'].setValue(0);
        this.addEditSettingForm.controls['Unit'].setValue(0);
        selectedQuantityValue = selectedUnitValue = 0;
        this.addEditSettingForm.controls['QuantityUnit'].setValue(null);
      }
    }
    this._toggleDefaultValueSelectorToEnumItems(selectedQuantityValue, selectedUnitValue);
  }

  private _toggleDefaultValueSelectorToEnumItems(selectedQuantity: number, selectedUnit: number, keepDefaultValue?: boolean) {
    let selectedEnumGroup = this.enumGroups?.find(e => e.Id === selectedUnit);
    if (selectedQuantity === this.enumQuntityOption.quantityId && selectedEnumGroup) {
      // reset default value if enumeration get change to trigger error messages
      if (!keepDefaultValue) { 
        this.addEditSettingForm.controls['DefaultValue'].setValue(null);
      }
      this.enumItemsOfSelectedEnumGroup = selectedEnumGroup.Items;
      this.showEnumItemsInDefaultValue = true;
    }
    else {
      this.enumItemsOfSelectedEnumGroup = [];
      this.showEnumItemsInDefaultValue = false;
    }
  }

}
