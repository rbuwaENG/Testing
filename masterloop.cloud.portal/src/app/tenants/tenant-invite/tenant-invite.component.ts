import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TenantService } from 'src/app/services/tenant.service';

@Component({
  selector: 'app-tenant-invite',
  templateUrl: './tenant-invite.component.html',
  styleUrls: ['./tenant-invite.component.scss']
})
export class TenantInviteComponent implements OnInit {

  public form: FormGroup;
  AccountId;
  TenantAdmin;
  CanAdmin;
  CanObserve;
  CanControl;

  constructor(
    public dialogRef: MatDialogRef<TenantInviteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private tenantService: TenantService) {}

  ngOnInit() {
      this.buildForm();
  }

  onSubmit() {
    let tenantUserInfo = this.form.value;
    tenantUserInfo['TenantId'] = this.data.TenantId;
    this.tenantService.allocateExistingUserToTenant(this.data.TenantId, tenantUserInfo).subscribe(result => {
      if(result == null) {
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
      TenantAdmin: new FormControl(''),
      CanAdmin: new FormControl(''),
      CanControl: new FormControl(''),
      CanObserve: new FormControl('')
    });
  }

}
