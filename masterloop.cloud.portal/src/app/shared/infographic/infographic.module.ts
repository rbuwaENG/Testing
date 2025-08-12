import { NgModule } from '@angular/core';
// import { MomentModule } from 'angular2-moment';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'angular2-highcharts';
import * as Highcharts from 'highcharts';
import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { PlotComponent } from './plot/plot.component';
import { MapComponent } from './map/map.component';
import { MapLegendComponent } from './map/map-legend.component';
import { TableComponent } from './table/table.component';

//const Highcharts = require('highcharts');
Highcharts.setOptions({
  colors: [
    '#0D68AF',
    '#ff0048',
    '#3dc7f4',
    '#92cc40',
    '#19C8FF',
    '#058DC7',
    '#50B432',
    '#ED561B',
    '#DDDF00',
    '#24CBE5',
    '#64E572',
    '#FF9655',
    '#FFF263',
    '#6AF9C4'
  ]
});

export function highchartsFactory() {
  return Highcharts;
}

@NgModule({
  declarations: [
    PlotComponent,
    MapComponent,
    MapLegendComponent,
    TableComponent
  ],
  exports: [PlotComponent, MapComponent, TableComponent],
  imports: [
    CommonModule,
    //MomentModule,
    ChartModule,
    NgxDatatableModule
  ],
  providers: [
    { provide: HighchartsStatic, useFactory: highchartsFactory }
  ]
})
export class InfographicModule {}
