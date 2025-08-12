import { NgModule } from '@angular/core';
import { MenuItems } from './menu-items/menu-items';
import {
  AccordionAnchorDirective,
  AccordionLinkDirective,
  AccordionDirective
} from './accordion';
import { ToggleFullscreenDirective } from './fullscreen/toggle-fullscreen.directive';
import { InfographicModule } from './infographic/infographic.module';
import { PlotComponent } from './infographic/plot/plot.component';
import { MapComponent } from './infographic/map/map.component';
import { TableComponent } from './infographic/table/table.component';
import { ReloadContentComponent } from './reload-content-component/reload-content-component.component';
import { AppMaterialModule } from './app-material.module';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule, NgxMatNativeDateModule } from '@angular-material-components/datetime-picker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DeleteConfirmDialogComponent } from './delete-confirm-dialog/delete-confirm-dialog.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AccordionAnchorDirective,
    AccordionLinkDirective,
    AccordionDirective,
    ToggleFullscreenDirective,
    ReloadContentComponent,
    DeleteConfirmDialogComponent
  ],
  exports: [
    AccordionAnchorDirective,
    AccordionLinkDirective,
    AccordionDirective,
    ToggleFullscreenDirective,
    PlotComponent,
    MapComponent,
    TableComponent,
    ReloadContentComponent,
    AppMaterialModule,
    DeleteConfirmDialogComponent
  ],
  imports: [
    AppMaterialModule, 
    InfographicModule,
    FormsModule
  ],
  entryComponents:[
    DeleteConfirmDialogComponent
  ],
  providers: [MenuItems]
})
export class SharedModule {}
