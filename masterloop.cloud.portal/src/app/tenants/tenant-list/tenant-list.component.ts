import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoggerService } from 'src/app/services';
import { TenantService } from 'src/app/services/tenant.service';
import { TenantAddComponent } from '../tenant-add/tenant-add.component';


export interface DialogData {
  animal: string;
  name: string;
}

@Component({
  selector: 'app-tenant-list',
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit {

  tenantList;
  isMobile: boolean = false;
  animal: string;
  name: string;

  constructor(
    protected loggerService: LoggerService,
    private tenantService: TenantService,
    public dialog: MatDialog,
    private router: Router) {
        /**Mobile UI trigger */
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    }
  }

  onResize() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  ngOnInit(): void {
    this.getTenantList();
  }

  getTenantList() {
    this.tenantService.getTenants().subscribe(data => {
      if(data != null) {
        this.tenantList = data;
        this.tenantList.sort((a,b) => a.Name.localeCompare(b.Name));
      } 
    },
    error => {
      this.loggerService.showErrorMessage(
        `Getting tenant details failed!`
      );
    });
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(TenantAddComponent, {
      width: '460px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result == 'success') {
        this.loggerService.showSuccessfulMessage('New tenant created succesfully.');
        this.getTenantList();
      }
    });
  }

  navigateToTenantDetails(row) {
    this.router.navigateByUrl(`tenants/${row.Id}/details`); 
  }

  navigateToTenantUsers(row) {
    this.router.navigateByUrl(`tenants/${row.Id}/users`); 
  }

}
