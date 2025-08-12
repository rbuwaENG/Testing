import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { ObservationsTableComponent } from "./observations-table/observations-table.component";
import { ObservationsPlotComponent } from "./observations-plot/observations-plot.component";
import { ObservationsMapComponent } from "./observations-map/observations-map.component";
import { TemplateAnalyzerComponent } from "./template-analyzer/template-analyzer.component";
import { DevicesMapComponent } from "./devices-map/devices-map.component";

export const routes: Routes = [
  {
    path: "",
    children: [
      { path: "observationTable", component: ObservationsTableComponent },
      { path: "observationPlot", component: ObservationsPlotComponent },
      { path: "map", component: ObservationsMapComponent },
      { path: "template-analyzer", component: TemplateAnalyzerComponent },
      { path: "devicesPosition", component: DevicesMapComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalyzerRoutingModule {}
