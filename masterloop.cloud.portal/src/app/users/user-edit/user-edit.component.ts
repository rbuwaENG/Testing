import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoggerService } from 'src/app/services';
import { UserService } from 'src/app/services/user.service';
import { UserData } from '../user-list/user-list.component';

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.scss']
})
export class UserEditComponent implements OnInit {

  public form: FormGroup;
  public isTwoFactorEnabled: boolean;
  public showTwoFactorToggle: boolean = false;
  public adminEmail: string = '';
  public adminPassword: string = '';

  constructor(
    public dialogRef: MatDialogRef<UserEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserData,
    private fb: FormBuilder,
    private userService: UserService,
    private loggerService: LoggerService
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.isTwoFactorEnabled = this.data.isTwoFactorEnabled || false;
  }

  onSubmit() {
    let changedUser = this.form.value;
    changedUser['passwordHashed'] = "";
    changedUser['passwordSalt'] = "";

    this.userService.editExistingUser(this.data.eMail, changedUser).subscribe(data => {
      if(data == null) {
        this.dialogRef.close('success');
      } else {
       this.loggerService.showErrorMessage('User update process failed. Please try again later.'); 
      }
    });
  }

  toggleTwoFactor() {
    this.showTwoFactorToggle = !this.showTwoFactorToggle;
  }

  async enableTwoFactor() {
    if (!this.adminEmail || !this.adminPassword) {
      this.loggerService.showErrorMessage('Please enter admin credentials to enable 2FA.');
      return;
    }

    try {
      this.userService.adminEnableTwoFactor(this.data.eMail, this.adminEmail, this.adminPassword).subscribe(
        (result: any) => {
          if (result && result.success) {
            this.loggerService.showSuccessfulMessage('Two-factor authentication enabled successfully!');
            this.isTwoFactorEnabled = true;
            this.showTwoFactorToggle = false;
            this.adminEmail = '';
            this.adminPassword = '';
          } else {
            this.loggerService.showErrorMessage(result?.message || 'Failed to enable 2FA.');
          }
        },
        error => {
          this.loggerService.showErrorMessage('Failed to enable 2FA. Please check admin credentials.');
        }
      );
    } catch (error) {
      this.loggerService.showErrorMessage('An error occurred while enabling 2FA.');
    }
  }

  async disableTwoFactor() {
    if (!this.adminEmail || !this.adminPassword) {
      this.loggerService.showErrorMessage('Please enter admin credentials to disable 2FA.');
      return;
    }

    try {
      this.userService.adminDisableTwoFactor(this.data.eMail, this.adminEmail, this.adminPassword).subscribe(
        (result: any) => {
          if (result && result.success) {
            this.loggerService.showSuccessfulMessage('Two-factor authentication disabled successfully!');
            this.isTwoFactorEnabled = false;
            this.showTwoFactorToggle = false;
            this.adminEmail = '';
            this.adminPassword = '';
          } else {
            this.loggerService.showErrorMessage(result?.message || 'Failed to disable 2FA.');
          }
        },
        error => {
          this.loggerService.showErrorMessage('Failed to disable 2FA. Please check admin credentials.');
        }
      );
    } catch (error) {
      this.loggerService.showErrorMessage('An error occurred while disabling 2FA.');
    }
  }

  private buildForm() {
    this.form = this.fb.group({
      eMail: new FormControl('', Validators.required),
      firstName: new FormControl('',  Validators.required),
      lastName: new FormControl('',  Validators.required),
      isAdmin: new FormControl('')
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
