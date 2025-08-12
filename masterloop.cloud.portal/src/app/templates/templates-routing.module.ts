import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { TemplatesComponent } from "./templates.component";
import { TemplateObservationsComponent } from "./template-observations/template-observations.component";
import { FirmwareReleaseComponent } from "./firmware/firmware-release/firmware-release.component";
import { TemplateListComponent } from "./template-list/template-list.component";
import { CanDeactivateGuard } from "../core/route-guards/can-deactivate-guard";
import { FirmwareManagerComponent } from './firmware-manager/firmware-manager.component';
import { TemplateDashboardComponent } from "./template-dashboard/template-dashboard.component";
import { TemplateDashboardAddEditComponent } from "./template-dashboard/template-dashboard-add-edit/template-dashboard-add-edit.component";
import { AddOnFeatureToggleGuard } from "../core/route-guards/add-on-feature-toggle.guard";
import { AddOnFeature } from "../core/enums/add-on-feature.enum";

const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "",
        component: TemplateListComponent,
      },
      {
        path: "details/view/:id",
        component: TemplatesComponent,
      },
      {
        path: "details/edit/:id",
        component: TemplatesComponent,
        canDeactivate: [CanDeactivateGuard],
      },
      {
        path: "templateObservation/:id",
        component: TemplateObservationsComponent,
      },
      {
        path: "firmwareRelease/:templateId",
        component: FirmwareReleaseComponent,
        canActivate: [AddOnFeatureToggleGuard],
        data: { addOnFeature: AddOnFeature.Firmware }
      },
      {
        path: ":templateId/firmwareManager",
        component: FirmwareManagerComponent,
        canActivate: [AddOnFeatureToggleGuard],
        data: { addOnFeature: AddOnFeature.Firmware }
      },
      {
        path: ":templateId/dashboards",
        component: TemplateDashboardComponent,
        canActivate: [AddOnFeatureToggleGuard],
        data: { addOnFeature: AddOnFeature.Dashboard }
      },
      {
        path: ":templateId/dashboards/:type",
        component: TemplateDashboardAddEditComponent,
        canActivate: [AddOnFeatureToggleGuard],
        data: { addOnFeature: AddOnFeature.Dashboard }
      },
      {
        path: ":templateId/dashboards/:dashboardId/edit",
        component: TemplateDashboardAddEditComponent,
        canActivate: [AddOnFeatureToggleGuard],
        data: { addOnFeature: AddOnFeature.Dashboard }
      }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TemplatesRoutingModule {}
