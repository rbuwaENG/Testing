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

  constructor(
    public dialogRef: MatDialogRef<UserEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserData,
    private fb: FormBuilder,
    private userService: UserService,
    private loggerService: LoggerService
  ) { }

  ngOnInit(): void {
    this.buildForm();
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
