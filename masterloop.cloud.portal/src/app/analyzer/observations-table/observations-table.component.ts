import * as moment from 'moment';
import { Component, OnInit, ViewContainerRef, ViewChild } from '@angular/core';
import {
  DeviceService,
  LoggerService,
  ObservationService,
  DialogsService,
  LiveConnectionService,
  AppSettings,
} from '../../services';
import { RangedAnalyzerComponent } from '../ranged-analyzer.component';
import { TableComponent } from '../../shared/infographic/table/table.component';
import { ObservationDataType } from '../../core/enums';
import { LocalStorageService } from '../../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';

declare var alasql: any;

@Component({
  selector: 'app-observations-table',
  templateUrl: './observations-table.component.html',
  styleUrls: ['./observations-table.component.scss'],
})
export class ObservationsTableComponent
  extends RangedAnalyzerComponent
  implements OnInit
{
  @ViewChild(TableComponent)
  protected infographicComponent: TableComponent;
  public infoGraphicOptions: any;

  constructor(
    appSettings: AppSettings,
    loggerService: LoggerService,
    deviceService: DeviceService,
    observationService: ObservationService,
    liveConnectionService: LiveConnectionService,
    protected dialogService: DialogsService,
    protected viewContainerRef: ViewContainerRef,
    cache: LocalStorageService,
    dbService: NgxIndexedDBService
  ) {
    super(
      appSettings,
      loggerService,
      deviceService,
      observationService,
      liveConnectionService,
      cache,
      dbService
    );
  }

  ngOnInit() {
    this.infoGraphicOptions = this.infoGraphicOptions || {};
    super.ngOnInit();
  }

  public clearObservationsValues(disconnectFromLive: boolean = false) {
    super.clearObservationsValues(disconnectFromLive);
    //this.infographicComponent.clearRows();
    //this.clearBuffer();
  }

  clearBuffer() {
    this.infographicComponent.clearRows();
  }

  public openExportPopup() {
    this.dialogService
      .confirm(
        'Export to Excel as ...',
        'Please enter filename',
        false,
        this.viewContainerRef,
        `csvExport_${moment().utc().format('L')}`
      )
      .subscribe((result) => {
        if (!result && result == false) {
          return;
        }
        if (!result || !result.length) {
          return this.loggerService.showErrorMessage(
            'Enter valid name as file name!'
          );
        }
        if (!result.match(/^[0-9a-zA-Z\._/]*$/)) {
          return this.loggerService.showErrorMessage(
            'Enter valid name as file name!'
          );
        }
        //console.log(this.infographicComponent.table);
        this._exportToExcel(result);
      });
  }

  private _formatColumnValueForExcel(columnDefinition: any, value: any): any {
    return value === undefined || value == null
      ? value
      : columnDefinition.dataType === ObservationDataType.Unknown
      ? moment.utc(value).format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]')
      : columnDefinition.dataType === ObservationDataType.Position
      ? `Lattitude: ${value.Latitude}, Longitude: ${value.Longitude}, Altitude: ${value.Altitude}`
      : value;
  }

  private _exportToExcel(exportAsFileName: string) {
    var csvOptions = {
      sheetid: 'Report',
      headers: true,
      style: 'font-size:25px',
      caption: { title: 'Report' },
      columns: this.infographicComponent.table.columns.map((m) => {
        return {
          title: m.name,
          columnid: m.prop,
        };
      }),
      column: { style: { Font: { Bold: '1' } } },
    };

    var csvData = this.infographicComponent.table.rows.map((row) => {
      row = Object.assign({}, row);
      Object.keys(row).forEach((key) => {
        if (isNaN(this.infographicComponent.table.columnIndexes[key])) {
          return;
        }
        row[key] = this._formatColumnValueForExcel(
          this.infographicComponent.table.columns[
            this.infographicComponent.table.columnIndexes[key]
          ],
          row[key]
        );
      });

      return row;
    });

    let columnsToRemove: { key: string; columns: any }[] = [];
    for (let csvItem of csvData) {
      for (let key in csvItem) {
        let data = csvItem[key];

        if (typeof data == 'string' && data.includes('Lattitude')) {
          // console.log(data)
          let position = data.split(',');
          let positionColumns = [];
          for (let i = 0; i < position.length; i++) {
            let column = `${key}_${i}`;
            csvItem[column] = position[i].split(':')[1].trim();
            if (positionColumns.findIndex((c) => c.columnid == column) < 0) {
              let columnName;
              let deviceId = key.split('_');
              if (i == 0) {
                columnName = `Latitude (${deviceId[0]})`;
              } else if (i == 1) {
                columnName = `Longtitude (${deviceId[0]})`;
              } else {
                columnName = `Altitude (${deviceId[0]})`;
              }
              positionColumns.push({
                title: columnName,
                columnid: column,
              });
            }
          }
          if (columnsToRemove.findIndex((c) => c.key == key) < 0) {
            columnsToRemove.push({ key: key, columns: positionColumns });
          }
          delete csvItem[key];
        }
      }
    }
    for (let column of columnsToRemove) {
      let index = csvOptions.columns.findIndex((c) => c.columnid == column.key);
      if (index >= 0) {
        csvOptions.columns.splice(index, 1);
        for (let i = 0; i < column.columns.length; i++) {
          csvOptions.columns.splice(index + i, 0, column.columns[i]);
        }
      }
    }
    csvData.sort(function (a, b) {
      if (a.timestamp > b.timestamp) return 1;
      if (a.timestamp < b.timestamp) return -1;
    });
    //  csvOptions.columns = csvOptions.columns.concat(positionColumns);

    alasql(`SELECT * INTO XLSXML("${exportAsFileName}.xls",?) FROM ?`, [
      csvOptions,
      csvData,
    ]);
  }
}
