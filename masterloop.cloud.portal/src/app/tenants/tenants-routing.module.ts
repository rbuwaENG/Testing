import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { CanDeactivateGuard } from "../core/route-guards/can-deactivate-guard";
import { TenantDetailsComponent } from "./tenant-details/tenant-details.component";
import { TenantListComponent } from "./tenant-list/tenant-list.component";
import { TenantUsersComponent } from "./tenant-users/tenant-users.component";

const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "",
        component: TenantListComponent,
      },
      {
        path: ":tenandId/users",
        component: TenantUsersComponent,
      },
      {
        path: ":tenandId/details",
        component: TenantDetailsComponent,
      }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TenantsRoutingModule {}
