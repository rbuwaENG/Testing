import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { SharedModule } from '../shared/shared.module';

import { ChartModule } from 'angular2-highcharts';
import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';
export function highchartsFactory() {
  return require('highcharts');
}

import { PipeModule } from '../pipes/pipes.module';
import { AnalyzerRoutingModule } from './analyzer-routing.module';
import { ObservationsPlotComponent } from './observations-plot/observations-plot.component';
import { ObservationsTableComponent } from './observations-table/observations-table.component';
import { ObservationsMapComponent } from './observations-map/observations-map.component';
import { TemplateAnalyzerComponent } from './template-analyzer/template-analyzer.component';
import { DevicesMapComponent } from './devices-map/devices-map.component';
import { FilterDialogComponent } from './template-analyzer/filter-dialog/filter-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    AnalyzerRoutingModule,
    NgxDatatableModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    PipeModule.forRoot(),
    SharedModule,
    ChartModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
  ],
  declarations: [
    ObservationsPlotComponent,
    ObservationsTableComponent,
    ObservationsMapComponent,
    TemplateAnalyzerComponent,
    DevicesMapComponent,
    FilterDialogComponent,
  ],
  providers: [
    {
      provide: HighchartsStatic,
      useFactory: highchartsFactory,
    },
  ],
})
export class AnalyzerModule {}
