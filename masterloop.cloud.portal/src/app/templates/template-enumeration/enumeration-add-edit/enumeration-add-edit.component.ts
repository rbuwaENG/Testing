import { Component, Inject, ViewContainerRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GuidGenerator } from 'src/app/core/helpers/guid-generator.helper';
import { DialogsService, LoggerService } from 'src/app/services';
import { EnumerationGroupDetails, EnumerationItem } from '../../../core/interfaces/template-enumeration.interface';

@Component({
  selector: 'app-enumeration-add-edit',
  templateUrl: './enumeration-add-edit.component.html',
  styleUrls: ['./enumeration-add-edit.component.scss']
})
export class EnumerationAddEditComponent {
  addEditEnumerationGroupForm: FormGroup;
  title: any;
  enumerationGroupDetails: EnumerationGroupDetails;
  enumerationItems: EnumerationItem[] = [];
  editing = {};

  constructor(
    public dialogRef: MatDialogRef<EnumerationAddEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private viewContainerRef: ViewContainerRef,
    private dialogService: DialogsService,
    private loggerService: LoggerService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.data['enumGroup'] == null) {
      this.title = "Add Enumeration Group";
    } else {
      let enumGroupDetail = this.data['enumGroup'];
      this.enumerationGroupDetails = enumGroupDetail;
      let enumItems = [...this.enumerationGroupDetails.Items];
      this.enumerationItems = [...enumItems];
      this.enumerationItems = [...this.enumerationItems]
      this.patchForm();
      this.title = `Edit Enumeration Group - ${this.enumerationGroupDetails.Name}`;
    }
  }

  patchForm() {
    this.addEditEnumerationGroupForm.patchValue({
      Id: this.enumerationGroupDetails.Id,
      Name: this.enumerationGroupDetails.Name
    });
  }

  initializeForm() {
    this.addEditEnumerationGroupForm = this.formBuilder.group({
      Id: new FormControl(this.data['enumRowId'], [Validators.required, this.duplicateIdValidator(this.data['enumGroups'], this.data['enumRowId'])]),
      Name: new FormControl('', [Validators.required])
    });
  }

  save() {
    let enumerationGroupDetails: EnumerationGroupDetails =
    {
      Id: parseInt(this.addEditEnumerationGroupForm.value.Id),
      Name: this.addEditEnumerationGroupForm.value.Name,
      Items: this.enumerationItems
    };

    this.dialogRef.close({
      data: enumerationGroupDetails
    })
  }

  onNoClick() {
    this.dialogRef.close({
      data: null
    });
  }

  duplicateIdValidator(enumGroups: any, initialId: any): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || initialId == +control.value)
        return null;
      else {
        var matchId = enumGroups?.find(s => s.Id == +control.value);
        if (matchId)
          return { duplicateId: true };
        else
          return null;
      }
    };
  }

  addEnumerationItem() {
    let enumerationItem = {
      Id: this.enumerationItems.length > 0
        ? +this.enumerationItems[this.enumerationItems.length - 1]['Id'] + 1
        : 0,
      Name: '',
      UniqueId: this.assignGuidForEnumItem()
    };
    this.enumerationItems.push(enumerationItem);
    this.enumerationItems = [...this.enumerationItems];
    this.editing[this.enumerationItems.length - 1 + '-cell'] = true;
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    if (cell == 'Id') {
      this.validateTheNewId(event, row, rowIndex);
    }

    this.editing[rowIndex + '-' + cell] = false;
    this.enumerationItems[rowIndex][cell] = event.target.value;
  }

  validateTheNewId(event, row, rowIndex) {
    this.enumerationItems.forEach((enumItem, index) => {
      if (index != rowIndex) {
        if (enumItem.Id == event.target.value) {
          this.loggerService.showErrorMessage(
            'The same template enumeration id is found in another enumeration.'
          );
          event.target.value = this.enumerationItems[rowIndex].Id;
        }
      }
    });
  }

  assignGuidForEnumItem(): string {
    var guid = GuidGenerator.uuidv4();
    return guid;
  }

  deleteEnumerationItem(enumItem, enumItemRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the enumeration item?',
        true,
        this.viewContainerRef
      )
      .subscribe(res => {
        if (res == true) {
          this.enumerationItems.splice(enumItemRow, 1);
          this.enumerationItems = [...this.enumerationItems];
          enumItem['IsDelete'] = true;
        }
      });
  }

}
