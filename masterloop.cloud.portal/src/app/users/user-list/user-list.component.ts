import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LoggerService } from 'src/app/services';
import { UserService } from 'src/app/services/user.service';
import { DeleteConfirmDialogComponent } from 'src/app/shared/delete-confirm-dialog/delete-confirm-dialog.component';
import { UserCreateInviteComponent } from '../user-create-invite/user-create-invite.component';
import { UserEditComponent } from '../user-edit/user-edit.component';

export interface UserData {
  eMail: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  @ViewChild('templateListTable') table: any;
  usersList;
  isMobile: boolean = false;

  constructor(
    private userService: UserService,
    public dialog: MatDialog,
    private loggerService: LoggerService
  ) {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    }
  }

  ngOnInit(): void {
    this.getAllUsers();
  }

  toggleExpandRow(row) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  onDetailToggle(event) {}

  onResize() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  openNewUser() {
    const dialogRef = this.dialog.open(UserCreateInviteComponent, {
      width: '550px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result == 'copied') {
        this.loggerService.showSuccessfulMessage('User created succesfully.');
        this.getAllUsers();
      }      
    });
  }


  getAllUsers() {
    this.userService.getAllUsers().subscribe(users => {
      if(users != null) {
        this.usersList = users;
        this.usersList.sort((a,b) => a.EMail.localeCompare(b.EMail));
      }
    });
  }

  openUserEditDialog(row) {
    const dialogRef = this.dialog.open(UserEditComponent, {
      width: '550px',
      data: {
        eMail : row.EMail,
        firstName : row.FirstName,
        lastName : row.LastName,
        isAdmin: row.IsAdmin
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result == 'success') {
        this.loggerService.showSuccessfulMessage('User updated succesfully.');
        this.getAllUsers();
      }      
    });
  }

  openUserDeleteDialog(row, event) {
    var dialogMsg = "Are you sure, you want to delete selected user?";
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent, {
      width: '250px',
      data: { message: dialogMsg }
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.userService.deleteUser(row.EMail).subscribe(deleteResult => {  
          if(deleteResult == null) {
            this.loggerService.showSuccessfulMessage('User deleted successfully.');
            // var index = this.usersList.findIndex(x => x.EMail == row.EMail);
            // this.usersList.splice(index, 1);
            this.getAllUsers();
          }
        }, error => {
          this.loggerService.showErrorMessage('User deletion failed.');
        });
      }
    });

  }

}
