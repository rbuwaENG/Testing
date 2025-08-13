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
  public isTwoFactorEnabled: boolean = false;
  public currentUserIsAdmin: boolean = false;
  public currentUserEmail: string = '';

  constructor(
    public dialogRef: MatDialogRef<UserEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserData,
    private formBuilder: FormBuilder,
    private userService: UserService,
    private loggerService: LoggerService,
    private userPermissionService: userPermissionService
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.isTwoFactorEnabled = this.data.isTwoFactorEnabled || false;
    this.checkCurrentUserAdminStatus();
    this.loadTwoFactorStatus();
  }

  private checkCurrentUserAdminStatus() {
    this.currentUserEmail = localStorage.getItem('currentUserEmail') || '';
    this.currentUserIsAdmin = this.userPermissionService.isAdminUser();
  }

  private loadTwoFactorStatus() {
    if (this.data.eMail) {
      this.userService.getUsersTwoFactorStatus().subscribe(
        (users: any[]) => {
          const currentUser = users.find(user => user.email === this.data.eMail);
          if (currentUser) {
            this.isTwoFactorEnabled = currentUser.isTwoFactorEnabled || false;
          }
        },
        error => {
          console.error('Failed to get 2FA status:', error);
          this.isTwoFactorEnabled = false;
        }
      );
    }
  }

  async toggleTwoFactor(checked: boolean) {
    if (!this.currentUserIsAdmin) {
      this.loggerService.showErrorMessage('Only admin users can manage two-factor authentication.');
      // Reset the checkbox to its previous state
      this.isTwoFactorEnabled = !checked;
      return;
    }

    // Prevent users from managing their own 2FA
    if (this.currentUserEmail === this.data.eMail) {
      this.loggerService.showErrorMessage('Users cannot manage their own two-factor authentication.');
      // Reset the checkbox to its previous state
      this.isTwoFactorEnabled = !checked;
      return;
    }

    try {
      if (checked) {
        // Enable 2FA
        this.userService.adminEnableTwoFactor(this.data.eMail).subscribe(
          (result: any) => {
            if (result && result.success) {
              this.loggerService.showSuccessfulMessage('Two-factor authentication enabled successfully!');
              this.isTwoFactorEnabled = true;
            } else {
              this.loggerService.showErrorMessage(result?.message || 'Failed to enable 2FA.');
              // Reset the checkbox to its previous state
              this.isTwoFactorEnabled = false;
            }
          },
          error => {
            this.loggerService.showErrorMessage('Failed to enable 2FA. Please try again.');
            // Reset the checkbox to its previous state
            this.isTwoFactorEnabled = false;
          }
        );
      } else {
        // Disable 2FA
        this.userService.adminDisableTwoFactor(this.data.eMail).subscribe(
          (result: any) => {
            if (result && result.success) {
              this.loggerService.showSuccessfulMessage('Two-factor authentication disabled successfully!');
              this.isTwoFactorEnabled = false;
            } else {
              this.loggerService.showErrorMessage(result?.message || 'Failed to disable 2FA.');
              // Reset the checkbox to its previous state
              this.isTwoFactorEnabled = true;
            }
          },
          error => {
            this.loggerService.showErrorMessage('Failed to disable 2FA. Please try again.');
            // Reset the checkbox to its previous state
            this.isTwoFactorEnabled = true;
          }
        );
      }
    } catch (error) {
      this.loggerService.showErrorMessage('An error occurred while managing 2FA.');
      // Reset the checkbox to its previous state
      this.isTwoFactorEnabled = !checked;
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

  private buildForm() {
    this.form = this.formBuilder.group({
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
