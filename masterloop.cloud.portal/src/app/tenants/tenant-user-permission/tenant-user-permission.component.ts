import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TenantService } from 'src/app/services/tenant.service';
import { TenantUserPermissionData } from '../tenant-users/tenant-users.component';

@Component({
  selector: 'app-tenant-user-permission',
  templateUrl: './tenant-user-permission.component.html',
  styleUrls: ['./tenant-user-permission.component.scss']
})
export class TenantUserPermissionComponent {

  public form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<TenantUserPermissionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TenantUserPermissionData,
    private fb: FormBuilder,
    private tenantService: TenantService) {}

  ngOnInit() {
      this.buildForm();
  }

  onSubmit() {
    console.log(this.form.value);
    let changedUserPermission = this.form.value;
    changedUserPermission['TenantId'] = this.data.TenantId;

    this.tenantService.updateTenantUserPermission(this.data.TenantId, changedUserPermission).subscribe(data => {
      if(data == null) {
        this.dialogRef.close();
      }
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  private buildForm() {
    this.form = this.fb.group({
      AccountId: new FormControl('', Validators.required),
      CanAdmin: new FormControl(''),
      CanControl: new FormControl(''),
      CanObserve: new FormControl('')
    });
  }

}
