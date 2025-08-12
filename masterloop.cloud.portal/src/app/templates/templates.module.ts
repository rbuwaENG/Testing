import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgxDatatableModule } from "@swimlane/ngx-datatable";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { FlexLayoutModule } from "@angular/flex-layout";

import { SharedModule } from "../shared/shared.module";
import { TemplatesRoutingModule } from "./templates-routing.module";
import { TemplatesComponent } from "./templates.component";
import { TemplateObservationsComponent } from "./template-observations/template-observations.component";
import { TemplateSettingsComponent } from "./template-settings/template-settings.component";
import { TemplateCommandsComponent } from "./template-commands/template-commands.component";
import { TemplatePulsesComponent } from "./template-pulses/template-pulses.component";
import { FirmwareComponent } from "./firmware/firmware.component";
import { FirmwareReleaseComponent } from "./firmware/firmware-release/firmware-release.component";
import { TemplateListComponent } from "./template-list/template-list.component";
import { GenerateConstantsComponent } from "./generate-constants/generate-constants.component";
import { FirmwareManagerComponent } from './firmware-manager/firmware-manager.component';
import { TemplateImportComponent } from './template-import/template-import.component';
import { TemplateDashboardComponent } from './template-dashboard/template-dashboard.component';
import { TemplateDashboardAddEditComponent } from './template-dashboard/template-dashboard-add-edit/template-dashboard-add-edit.component';
import { ObservationAddEditComponent } from './template-observations/observation-add-edit/observation-add-edit.component';
import { SettingAddEditComponent } from './template-settings/setting-add-edit/setting-add-edit.component';
import { TemplateDashboaardPreviewPopupComponent } from './template-dashboard/template-dashboaard-preview-popup/template-dashboaard-preview-popup.component';
import { TemplateEnumerationComponent } from './template-enumeration/template-enumeration.component';
import { EnumerationAddEditComponent } from './template-enumeration/enumeration-add-edit/enumeration-add-edit.component';

@NgModule({
  imports: [
    CommonModule,
    TemplatesRoutingModule,
    NgxDatatableModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    SharedModule,
  ],
  declarations: [
    TemplatesComponent,
    TemplateObservationsComponent,
    TemplateSettingsComponent,
    TemplateCommandsComponent,
    TemplatePulsesComponent,
    FirmwareComponent,
    FirmwareReleaseComponent,
    TemplateListComponent,
    GenerateConstantsComponent,
    FirmwareManagerComponent,
    TemplateDashboardComponent,
    TemplateDashboardAddEditComponent,
    ObservationAddEditComponent,
    SettingAddEditComponent,
    TemplateDashboaardPreviewPopupComponent,
    TemplateEnumerationComponent,
    EnumerationAddEditComponent,
    //TemplateImportComponent,
  ],
})
export class TemplateModule {}
