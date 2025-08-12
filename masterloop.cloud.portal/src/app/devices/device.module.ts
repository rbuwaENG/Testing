import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgxDatatableModule } from "@swimlane/ngx-datatable";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { FlexLayoutModule } from "@angular/flex-layout";
import { SharedModule } from "../shared/shared.module";
// import { MdInputModule, MaterialModule, MdTooltipModule } from '@angular/material';
import { ChartModule } from 'angular2-highcharts';
import * as Highcharts from 'highcharts';
import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
// import { NguiDatetimePickerModule } from '@ngui/datetime-picker';
// import { MomentModule } from 'angular2-moment';
// declare var require: any;
//const Highcharts = require('highcharts');

export function highchartsFactory() {
  return Highcharts;
}

import { FileUtil } from "../common/file.util";
import { DeviceRoutingModule } from "./device-routing.module";
import { DeviceListingComponent } from "./device-listing.component";
import { GeneralDeviceDetailsComponent } from "./general-category/general-device-details.component";
import { DataCategoryComponent } from "./data-category/data-category.component";
import { CommandCategoryComponent } from "./command-category/command-category.component";
import { SecurityCategoryComponent } from "./security-category/security-category.component";
import { ObservationsComponent } from "./data-category/observations/observations.component";
import {
  ObservationPlotComponent,
  ObservationTableComponent,
  ObservationMapComponent,
} from "./data-category/observation";
import { EventTableComponent } from "./data-category/event/table/table.component";
import { PulsePlotComponent } from "./data-category/pulse/plot/plot.component";
import { SendComponent } from "./command-category/send/send.component";
import { EditSendComponent } from "./command-category/send/edit-send.component";
import { HistoryComponent } from "./command-category/history/history.component";
import { PermissionComponent } from "./security-category/permission/permission.component";
import { SettingsComponent } from "./data-category/settings/settings.component";
import { EditSettingsComponent } from "./data-category/settings/edit-settings/edit-settings.component";
import { ImportComponent } from "./data-category/import/import.component";
import { MultipleObservationsComponent } from "./data-category/multiple-observations/multiple-observations.component";
import { ObservationsPlotSelectedComponent } from "./data-category/observations-plot-selected/observations-plot-selected.component";
import { ObservationsTableSelectedComponent } from "./data-category/observations-table-selected/observations-table-selected.component";
import { ObservationSelectedTableComponent } from "./data-category/observations-table-selected/table/table.component";
import { MultipleSendComponent } from "./command-category/multiple-send/multiple-send.component";
import { DumpTableComponent } from "./data-category/dump-table/dump-table.component";
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule, NgxMatNativeDateModule } from '@angular-material-components/datetime-picker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxMatMomentModule } from '@angular-material-components/moment-adapter';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';
import { StatPlotComponent } from './data-category/observation/stat-plot/stat-plot.component';
import { DeviceDeleteComponent } from './device-delete/device-delete.component';
import { DeviceDashboardComponent } from './device-dashboard/device-dashboard.component';
import { DragDropModule } from "@angular/cdk/drag-drop";
import { ViewDashboardComponent } from './device-dashboard/view-dashboard/view-dashboard.component';
import { SecurityPopupComponent } from './security-category/security-popup/security-popup.component';
import { MatTooltipModule } from "@angular/material/tooltip";
 

@NgModule({
  imports: [
    CommonModule,
    DeviceRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    NgxDatatableModule,
    SharedModule,
    // MdInputModule,
    // MdTooltipModule,
    // NguiDatetimePickerModule,
    ChartModule.forRoot(Highcharts),
     ChartModule,
     MatDatepickerModule,
     NgxMatDatetimePickerModule,
     NgxMatTimepickerModule,   
     NgxMatMomentModule,
     OwlDateTimeModule, 
     OwlNativeDateTimeModule,
     DragDropModule,
     MatTooltipModule
    // MomentModule
  ],
  declarations: [
    DeviceListingComponent,
    GeneralDeviceDetailsComponent,
    DataCategoryComponent,
    CommandCategoryComponent,
    SecurityCategoryComponent,
    ObservationsComponent,
    ObservationTableComponent,
    ObservationPlotComponent,
    ObservationMapComponent,
    SendComponent,
    EventTableComponent,
    PulsePlotComponent,
    EditSendComponent,
    HistoryComponent,
    PermissionComponent,
    SettingsComponent,
    EditSettingsComponent,
    ImportComponent,
    MultipleObservationsComponent,
    ObservationsPlotSelectedComponent,
    ObservationsTableSelectedComponent,
    ObservationSelectedTableComponent,
    MultipleSendComponent,
    DumpTableComponent,
    StatPlotComponent,
    DeviceDeleteComponent,
    DeviceDashboardComponent,
    ViewDashboardComponent,
    SecurityPopupComponent
  ],
  providers: [
    {
      provide: HighchartsStatic,
      useFactory: highchartsFactory
    },
    FileUtil,
  ],
})
export class DeviceModule {}
