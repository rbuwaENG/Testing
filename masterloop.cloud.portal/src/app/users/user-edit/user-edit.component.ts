import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoggerService } from 'src/app/services';
import { UserService } from 'src/app/services/user.service';
import { userPermissionService } from 'src/app/services/user-permission.service';
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
  public currentUserIsAdmin: boolean = false;
  public currentUserEmail: string = '';

  constructor(
    public dialogRef: MatDialogRef<UserEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserData,
    private fb: FormBuilder,
    private userService: UserService,
    private loggerService: LoggerService,
    private userPermissionService: userPermissionService
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.isTwoFactorEnabled = this.data.isTwoFactorEnabled || false;
    this.checkCurrentUserAdminStatus();
  }

  checkCurrentUserAdminStatus() {
    // Get current user info from localStorage
    const userInfo = this.userPermissionService.getUserPermissionFromLocalStorage();
    if (userInfo) {
      this.currentUserIsAdmin = userInfo.isAdmin || false;
      this.currentUserEmail = userInfo.email || '';
    }
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
    // Only allow admin users to toggle 2FA
    if (!this.currentUserIsAdmin) {
      this.loggerService.showErrorMessage('Only admin users can manage two-factor authentication.');
      return;
    }
    this.showTwoFactorToggle = !this.showTwoFactorToggle;
  }

  async enableTwoFactor() {
    if (!this.currentUserIsAdmin) {
      this.loggerService.showErrorMessage('Only admin users can manage two-factor authentication.');
      return;
    }

    try {
      // Use current user's credentials automatically
      this.userService.adminEnableTwoFactor(this.data.eMail).subscribe(
        (result: any) => {
          if (result && result.success) {
            this.loggerService.showSuccessfulMessage('Two-factor authentication enabled successfully!');
            this.isTwoFactorEnabled = true;
            this.showTwoFactorToggle = false;
          } else {
            this.loggerService.showErrorMessage(result?.message || 'Failed to enable 2FA.');
          }
        },
        error => {
          this.loggerService.showErrorMessage('Failed to enable 2FA. Please try again.');
        }
      );
    } catch (error) {
      this.loggerService.showErrorMessage('An error occurred while enabling 2FA.');
    }
  }

  async disableTwoFactor() {
    if (!this.currentUserIsAdmin) {
      this.loggerService.showErrorMessage('Only admin users can manage two-factor authentication.');
      return;
    }

    if (!confirm('Are you sure you want to disable two-factor authentication for this user? This will make their account less secure.')) {
      return;
    }

    try {
      // Use current user's credentials automatically
      this.userService.adminDisableTwoFactor(this.data.eMail).subscribe(
        (result: any) => {
          if (result && result.success) {
            this.loggerService.showSuccessfulMessage('Two-factor authentication disabled successfully!');
            this.isTwoFactorEnabled = false;
            this.showTwoFactorToggle = false;
          } else {
            this.loggerService.showErrorMessage(result?.message || 'Failed to disable 2FA.');
          }
        },
        error => {
          this.loggerService.showErrorMessage('Failed to disable 2FA. Please try again.');
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
