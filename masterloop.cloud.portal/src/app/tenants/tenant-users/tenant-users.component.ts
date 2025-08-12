import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/confirm-dialog/confirm-dialog.component';
import { LoggerService } from 'src/app/services';
import { TenantService } from 'src/app/services/tenant.service';
import { DeleteConfirmDialogComponent } from 'src/app/shared/delete-confirm-dialog/delete-confirm-dialog.component';
import { TenantInviteComponent } from '../tenant-invite/tenant-invite.component';
import { TenantUserPermissionComponent } from '../tenant-user-permission/tenant-user-permission.component';
import { userPermissionService } from 'src/app/services/user-permission.service';

export interface TenantUserPermissionData {
  AccountId: string;
  CanAdmin: boolean;
  CanControl: boolean;
  CanObserve: boolean;
  TenantId: number;
  TenantName: string;
}

@Component({
  selector: 'app-tenant-users',
  templateUrl: './tenant-users.component.html',
  styleUrls: ['./tenant-users.component.scss']
})
export class TenantUsersComponent implements OnInit {

  tenantId;
  tenantUsersList;
  isMobile;
  tenantName = "";
  loggedUserPermission;
  loggedUserPermissionForTenant;

  constructor(
    route: ActivatedRoute,
    public dialog: MatDialog,
    private loggerService: LoggerService,
    private router: Router, 
    private tenantService: TenantService,
    private userPermissionService: userPermissionService) {
      this.tenantId = route.snapshot.params['tenandId'];
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
        this.isMobile = true;
      }
     }

  ngOnInit(): void {
    this.getTenantInfo();
    
  }

  onResize() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  getUserPermission() {
    let loggedUserPermission = this.userPermissionService.getUserPermissionFromLocalStorage();
    let tenantPermission = loggedUserPermission['Tenants'].filter(t =>t.TenantId == this.tenantId);
    if(tenantPermission.length > 0) {
      this.loggedUserPermissionForTenant  = tenantPermission[0];
    } else {
      tenantPermission['CanAdmin'] = false;
      this.loggedUserPermissionForTenant = tenantPermission;
    }
  }

  getTenantInfo() {
    let getTenantUsers = this.tenantService.getTenantUsers(this.tenantId);
    let getTenantInfo = this.tenantService.getTenants()

    forkJoin([getTenantInfo, getTenantUsers]).subscribe( results => {
      this.tenantName = results[0].filter( t => t.Id == this.tenantId)[0].Name;
      this.tenantUsersList = results[1];
      this.tenantUsersList.sort((a,b) => a.AccountId.localeCompare(b.AccountId));
      this.getUserPermission();
    }, error => {
      this.loggerService.showErrorMessage('Getting tenant related information failed!');
    });
  }

  /**
   * Invite new user to the tenant
   */
   openUserInvitation() {
    const dialogRef = this.dialog.open(TenantInviteComponent, {
      width: '550px',
      data: {
        TenantId: this.tenantId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result != null) {
        this.tenantId = result;
        this.loggerService.showSuccessfulMessage('User added successfully!');
        this.getTenantInfo();
      }
    });
   }

  /**
   * Edit user permission dialog
   */
   openPermissionChangeDialog(row) {
    const dialogRef = this.dialog.open(TenantUserPermissionComponent, {
      width: '550px',
      data: {
        AccountId: row.AccountId,
        CanAdmin: row.CanAdmin,
        CanControl: row.CanControl,
        CanObserve: row.CanObserve,
        TenantId: row.TenantId,
        TenantName: this.tenantName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result != null) {
        this.tenantId = result;
        this.loggerService.showSuccessfulMessage('User permission changed successfully!');
        this.getTenantInfo();
      }
    });
   }

   /**
    * Tenant user delete dialog
    */
    openUserDeleteDialog(row, event) {
      var dialogMsg = "Are you sure, you want to delete selected user?";
      const dialogRef = this.dialog.open(DeleteConfirmDialogComponent, {
        width: '250px',
        data: { message: dialogMsg }
      });
      dialogRef.afterClosed().subscribe(result => {
        if(result) {
          this.tenantService.deleteTenantUser(row.TenantId, row).subscribe(deleteResult => { 
            if(deleteResult == null) {
              this.loggerService.showSuccessfulMessage('Tenant user deleted successfully.');
              this.getTenantInfo();
            }
          }, error => {
            this.loggerService.showErrorMessage('Tenant user deletion failed.');
          });
        }
      });

    }

}
