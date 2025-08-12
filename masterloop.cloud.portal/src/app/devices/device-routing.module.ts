import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { DeviceListingComponent } from "./device-listing.component";
import { GeneralDeviceDetailsComponent } from "./general-category/general-device-details.component";
import { ObservationsComponent } from "./data-category/observations/observations.component";
import { EventTableComponent } from "./data-category/event/table/table.component";
import { PulsePlotComponent } from "./data-category/pulse/plot/plot.component";
import { DumpTableComponent } from "./data-category/dump-table/dump-table.component";
import {
  ObservationPlotComponent,
  ObservationTableComponent,
  ObservationMapComponent,
} from "./data-category/observation";
import { SendComponent } from "./command-category/send/send.component";
import { MultipleSendComponent } from "./command-category/multiple-send/multiple-send.component";
import { EditSendComponent } from "./command-category/send/edit-send.component";
import { HistoryComponent } from "./command-category/history/history.component";
import { PermissionComponent } from "./security-category/permission/permission.component";
import { SettingsComponent } from "./data-category/settings/settings.component";
import { EditSettingsComponent } from "./data-category/settings/edit-settings/edit-settings.component";
import { ImportComponent } from "./data-category/import/import.component";
import { MultipleObservationsComponent } from "./data-category/multiple-observations/multiple-observations.component";
import { ObservationsPlotSelectedComponent } from "./data-category/observations-plot-selected/observations-plot-selected.component";
import { ObservationsTableSelectedComponent } from "./data-category/observations-table-selected/observations-table-selected.component";
import { StatPlotComponent } from './data-category/observation/stat-plot/stat-plot.component';
import { DeviceDashboardComponent } from "./device-dashboard/device-dashboard.component";
import { ViewDashboardComponent } from "./device-dashboard/view-dashboard/view-dashboard.component";
import { AddOnFeature } from "../core/enums/add-on-feature.enum";
import { DeviceAddOnFeatureToggleGuard } from "../core/route-guards/device-add-on-feature-toggle.guard";

export const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "all",
        component: DeviceListingComponent,
      },
      {
        path: "filter/:filterBy",
        component: DeviceListingComponent,
      },
      {
        path: "filter/:filterBy/:templateId",
        component: DeviceListingComponent,
      },
      {
        path: "listingbytemplate/:templateId",
        component: DeviceListingComponent,
      },
      {
        path: "general/:id",
        component: GeneralDeviceDetailsComponent,
      },
      {
        path: "create",
        component: GeneralDeviceDetailsComponent,
      },
      {
        path: "observations/:id",
        component: ObservationsComponent,
      },
      {
        path: "events/:id",
        component: EventTableComponent,
      },
      {
        path: ":deviceId/observations/:observationId/:observationName/plot",
        component: ObservationPlotComponent,
      },
      {
        path: ":deviceId/observations/:observationId/:observationName/table",
        component: ObservationTableComponent,
      },
      {
        path:
          ":deviceId/observations/:observationId/:observationName/:dataType/map",
        component: ObservationMapComponent,
      },
      {
        path:
          ":deviceId/observations/:observationId/:observationName/:dataType/table",
        component: ObservationTableComponent,
      },
      {
        path: ":deviceId/commandsHistory",
        component: HistoryComponent,
      },
      {
        path: "sendCommands/:id",
        component: SendComponent,
      },
      {
        path: "quickCommands/:id",
        component: MultipleSendComponent,
      },
      {
        path: "editSendCommand/:id/:commandId",
        component: EditSendComponent,
      },
      {
        path: ":deviceId/pulse",
        component: PulsePlotComponent,
      },
      {
        path: ":deviceId/stream",
        component: DumpTableComponent,
      },
      {
        path: "permission/:id",
        component: PermissionComponent,
      },
      {
        path: "settings/:id",
        component: SettingsComponent,
      },
      {
        path: "editSetting/:id/:settingId",
        component: EditSettingsComponent,
      },
      {
        path: "import/:id",
        component: ImportComponent,
      },
      {
        path: ":deviceId/observations/live",
        component: MultipleObservationsComponent,
      },
      {
        path: "observations/:id/plots",
        component: ObservationsPlotSelectedComponent,
      },
      {
        path: "observations/:id/table",
        component: ObservationsTableSelectedComponent,
      },
      {
        path: ":deviceId/observations/:observationId/:observationName/statPlot",
        component: StatPlotComponent,
      },
      {
        path: ":deviceId/dashboards",
        component: DeviceDashboardComponent,
        canActivate: [DeviceAddOnFeatureToggleGuard],
        data: { addOnFeature: AddOnFeature.Dashboard }
      },
      {
        path: ":deviceId/dashboards/:dashboardId",
        component: ViewDashboardComponent,
        canActivate: [DeviceAddOnFeatureToggleGuard],
        data: { addOnFeature: AddOnFeature.Dashboard }
      }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeviceRoutingModule { }
