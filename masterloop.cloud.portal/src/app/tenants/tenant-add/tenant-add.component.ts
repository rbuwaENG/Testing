import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoggerService } from 'src/app/services';
import { TenantService } from 'src/app/services/tenant.service';
import { DialogData } from 'src/app/templates/firmware-manager/create-firmware-dialog.component';
import { TenantUserPermissionData } from '../tenant-users/tenant-users.component';

@Component({
  selector: 'app-tenant-add',
  templateUrl: './tenant-add.component.html',
  styleUrls: ['./tenant-add.component.scss']
})
export class TenantAddComponent {

  public form: FormGroup;
  name;

  constructor(
    public dialogRef: MatDialogRef<TenantAddComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TenantUserPermissionData,
    private fb: FormBuilder,
    private tenantService: TenantService,
    private loggerService: LoggerService) {}

    ngOnInit() {
      this.buildForm();
    }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit() {    
    let formValue = this.form.value['name'];
    this.tenantService.createNewTenant(formValue).subscribe(result => {
      if(result == null) {
        this.dialogRef.close('success');
      } else {
          this.loggerService.showErrorMessage('Something went wrong.Please try again later.');
      }
    });
  }


  private buildForm() {
    this.form = this.fb.group({
      name: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z \-\']+')])
    });
  }

}
