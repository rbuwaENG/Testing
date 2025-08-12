import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxDatatableModule } from "@swimlane/ngx-datatable";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { FlexLayoutModule } from "@angular/flex-layout";
import { TenantListComponent } from './tenant-list/tenant-list.component';
import { SharedModule } from "../shared/shared.module";

import { TenantsRoutingModule } from "./tenants-routing.module";
import { TenantAddComponent } from './tenant-add/tenant-add.component';
import { TenantUsersComponent } from './tenant-users/tenant-users.component';
import { TenantUserPermissionComponent } from './tenant-user-permission/tenant-user-permission.component';
import { TenantInviteComponent } from './tenant-invite/tenant-invite.component';
import { TenantDetailsComponent } from './tenant-details/tenant-details.component';



@NgModule({
  declarations: [TenantListComponent, TenantAddComponent, TenantUsersComponent, TenantUserPermissionComponent, TenantInviteComponent, TenantDetailsComponent],
  imports: [
    CommonModule,
    TenantsRoutingModule,
    NgxDatatableModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    SharedModule,
  ]
})
export class TenantModule {}
