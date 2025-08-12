import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-user-create-invite',
  templateUrl: './user-create-invite.component.html',
  styleUrls: ['./user-create-invite.component.scss']
})
export class UserCreateInviteComponent implements OnInit {

  createUser : boolean = true;
  inviteUser : boolean = false;

  passwordGenerated;
  passwordSectionShow : boolean = false;

  public createUserForm: FormGroup;
  public inviteUserForm: FormGroup;

  eMail;
  firstName;
  lastName;
  passwordHashed;
  passwordSalt;
  isAdmin;
  passwordCopied: boolean;



  constructor(private fb: FormBuilder,
    private userService: UserService,
    public dialogRef: MatDialogRef<UserCreateInviteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
    this.buildCreateUserForm(); 
    this.createUser = true;
  }

  onCreate() {
    let userCreateInfo = this.createUserForm.value;
    userCreateInfo['passwordHashed'] = "";
    userCreateInfo['passwordSalt'] = "";

    this.userService.createUser(userCreateInfo).subscribe(data => {
      if(data.status == 200) {
        this.passwordSectionShow = true;
        this.passwordGenerated = data.body;
        this.createUser = false;
      }
      // if(data == null) {
      //   this.dialogRef.close();
      // }
    });
  }

  onNoClick() {
    this.dialogRef.close();
  }

  onInvite() {
    console.log(this.inviteUserForm.value);
  }


  changeOption(event) {
    console.log(event);
    if(event.value != null) {
      if(event.value == "create") {
        this.buildCreateUserForm(); 
        this.createUser = true;
        this.inviteUser = false;  
             
      } else {
        this.buildUserInviteForm();
        this.createUser = false;
        this.inviteUser = true;        
      }
    }
  }

  confirmCopy() {
    this.passwordCopied = true;
  }

  closeAfterConfirmingPasswordCopy() {
    this.dialogRef.close('copied');
  }
  private buildCreateUserForm() {
    this.createUserForm = this.fb.group({
      eMail: new FormControl('', Validators.required),
      firstName: new FormControl('', Validators.required),
      lastName: new FormControl('', Validators.required),
      // passwordHashed: new FormControl(''),
      // passwordSalt: new FormControl(''),
      isAdmin: new FormControl('')
    });
  }
  private buildUserInviteForm() {
    this.inviteUserForm = this.fb.group({
      eMail: new FormControl('', Validators.required),
      //firstName: new FormControl('', Validators.required),
      //lastName: new FormControl('', Validators.required),
      // passwordHashed: new FormControl(''),
      // passwordSalt: new FormControl(''),
      isAdmin: new FormControl('')
    });
  }

}
