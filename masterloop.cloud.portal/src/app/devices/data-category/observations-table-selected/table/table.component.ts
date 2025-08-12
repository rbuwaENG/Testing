import * as moment from 'moment';
import { Component, Input, Output, ViewChild, TemplateRef, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';

/* importing internals ... */
import { ObservationDataType } from '../../../../core/enums';
import { ObservationStruct, DeviceStruct } from '../../../../core/models';
import { StringExtension } from '../../../../core/extensions';
import { BasePlottableComponent } from '../../../../shared/infographic/base.plottable.component';
import { type } from 'os';
import { ObservationStatOverflowDialog } from 'src/app/analyzer/observations-table/observation-stat-dialog.component';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-infograph-table-observation',
  changeDetection : ChangeDetectionStrategy.OnPush,
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class ObservationSelectedTableComponent extends BasePlottableComponent implements OnDestroy {

  @ViewChild('postitionTypedColumnTemplate')
  protected postitionTypedColumnTemplate: TemplateRef<any>;

  @ViewChild('timestampColumnTemplate')
  protected timestampColumnTemplate: TemplateRef<any>;

  @ViewChild('statisticsTypedColumnTemplate')
  protected statisticsTypedColumnTemplate: TemplateRef<any>;

  @ViewChild('selectedObservationListTable') selectedObservationListTable: any;

  @Input()
  public graphicOptions: any;
  @Input()
  public from: moment.Moment;
  @Input()
  public to: moment.Moment;

  protected subscriptions: any;
  @Output()
  public table: any;
  deviceObservationIds: any = [];

  isMobile: boolean = false;

  constructor(
    private cd: ChangeDetectorRef,
    public dialog: MatDialog
    ) {
    super();
    this.subscriptions = {};
    /**Mobile UI trigger */
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    }
  }

  getType(value: any) {
    return typeof(value);
  }

  onResize() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  toggleExpandRow(row: any) {
    this.selectedObservationListTable.rowDetail.toggleExpandRow(row);
  }

  onDetailToggle(event) {
  }

  dialogRef: MatDialogRef<ObservationStatOverflowDialog>;
  obsDetails: any = null;
  lastCloseResult: string;
  config: MatDialogConfig = {
    disableClose: false,
    width: '50%',
    height: '55%',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: ''
    }
  };
  open(row, rowIndex, record) {
    this.dialogRef = this.dialog.open(ObservationStatOverflowDialog, this.config);
    let value = "";
    if(row != null) {
      value = `
      Minimum:${record.Minimum}\r\n
      Maximum : ${record.Maximum}\r\n
      Mean: ${record.Mean}\r\n
      Median: ${record.Median}\r\n
      Standard Deviation: ${record.StdDev}\r\n
      Count: ${record.Count}\r\n
      From: ${record.From}\r\n
      To: ${record.To}\r\n
      `;
    }

    

    this.obsDetails = {
      CurrentValue: value,
      Timestamp: row.timestamp
    };


    this.dialogRef.componentInstance.details = this.obsDetails;

    this.dialogRef.afterClosed().subscribe(result => {
      this.lastCloseResult = result;
      this.dialogRef = null;
      this.obsDetails = null;
    });
  }

  private _getObservationRowColumnId(device: DeviceStruct, observation: ObservationStruct): string { return StringExtension.toSnakeCase(`${device.MID}_${observation.Id}`); }
  private _getObservationRowColumnTemplate(observation: ObservationStruct | any): TemplateRef<any> {
    if(observation.DataType === ObservationDataType.Position) {
      return this.postitionTypedColumnTemplate;
    } else if(observation.DataType === ObservationDataType.Statistics) {
      return this.statisticsTypedColumnTemplate;
    } else {
      return null;
    }
    //  return (observation.DataType === ObservationDataType.Position) ? this.postitionTypedColumnTemplate : null; 
  }
  private _getDefaultColumns(): any[] { 
    return [{ prop: 'timestamp',
    name: 'Timestamp',
    dataType: ObservationDataType.Unknown,
    minWidth: this.setColumnsMinWidth(ObservationDataType.Unknown),
    width: this.setColumnsMinWidth(ObservationDataType.Unknown),
    cellTemplate: this.timestampColumnTemplate }];
  }

  private _updateColumnIndexes() {
    this.table.columnIndexes = this.table.columns.reduce((result, current, index) => Object.assign(result, JSON.parse(`{"${current.prop}": ${index}}`)), {});
  }

  private _onObservationValuesChange(device: DeviceStruct | any, observation: ObservationStruct | any, values: any[], append: boolean = false) {
    //var time = moment();
    /* remove all existing row values of observation if not appending .... */
    if (!append) { this._removeObservationValueRows(observation); }

    /* adding or updating row with observation value ... */
    values.forEach(value => {
      let index = this.table.rows.findIndex(m => m.timestamp === value.Timestamp);
      if (index < 0) { 
        index = this.table.rows.push({ timestamp: value.Timestamp }) - 1; }
      this.table.rows[index][observation._columnId] = value.Value;
    });
    
    this.table.rows.sort((a, b) => a.timestamp - b.timestamp);
    this.arrangeValuesWithVoidEmpty(); 
  }

  arrangeValuesWithVoidEmpty() {

    let columns = this.table.columns;
    let rows = this.table.rows;
    if(rows.length > 0) {
      rows.forEach((row) => {
        columns.forEach((column) => {
          if(column.prop != "timestamp") {
            let exist =   row.hasOwnProperty(column.prop);   //.filter(r =>r.hasOwnProperty(column.prop));
            if(exist) {
              if(row[column.prop] != "0") {
                if(row[column.prop] == "") {
                  row[column.prop] = '<span class="empty">empty</span>';
                }
              }
            } 
            // else {
            //   row[column.prop] = "void";
            // }
          }
        });
      });  
    }
    this.table.rows = [...this.table.rows];
    this.cd.detectChanges();
  }


  private _removeObservationValueRows(observation: ObservationStruct | any, values?: any[]) {
    /* NOTE: this is very COSTLY function as it iterates throw all the rows. This is intended to be used when remove columns.
    If you are using this for setting new values for all columns. Its best you use "clearRows()" before setting new values ... */
    //var defaultColumnsCount = this._getDefaultColumns().length;
    var otherColumns = [...this._getDefaultColumns().map(m => m.prop), observation._columnId];
    otherColumns = this.table.columns.map(m => m.prop).filter(m => otherColumns.indexOf(m) < 0)
    var index = -1;
    values = values || observation._values.getValue();
    var time = moment();

    this.table.rows
      .filter(m => m.hasOwnProperty(observation._columnId))
      .filter(m => values.findIndex(n => (n.Timestamp === m.timestamp)) >= 0)
      .forEach(row => {
        if ((index = this.table.rows.indexOf(row)) < 0) { return; }
        // delete property is row has any key other than current column ...
        // else delete row from array ...
        if (Object.keys(this.table.rows[index]).some(m => otherColumns.indexOf(m) >= 0)) { return delete this.table.rows[index][observation._columnId]; }
        this.table.rows.splice(index, 1);
        this.table.rows = [...this.table.rows];
      });
  }

  public addDeviceObservation(device: DeviceStruct | any, observation: ObservationStruct | any): void {
    /* add device and observation if they already weren't. and retreive them by their reference.. */
    device = (this.graphicOptions.devices = this.graphicOptions.devices || {})[device.MID] || (this.graphicOptions.devices[device.MID] = device);
    observation = ((device._selectedObservations = device._selectedObservations || {})[observation.Id] || (device._selectedObservations[observation.Id] = observation));

    /* create columnId and map its index ... */
    observation._columnId = this._getObservationRowColumnId(device, observation);
    let column: any;

    this.deviceObservationIds.push(`${observation._columnId}@@${observation.Name}@@${observation.DataType}`);

    if((observation.DataType == 2)) {
      column = {
        prop: observation._columnId,
        name: `${observation.Name}`,
        dataType: observation.DataType,
        maxWidth: this.setColumnsMaxWidth(observation.DataType),
        cellTemplate: this._getObservationRowColumnTemplate(observation)
      }
    } 
    else if (observation.DataType == 5 || observation.DataType == 0) {
      column = {
        prop: observation._columnId,
        name: `${observation.Name}`,
        dataType: observation.DataType,
        minWidth: this.setColumnsMinWidth(observation.DataType),
        width: this.setColumnsMinWidth(observation.DataType),
        cellTemplate: this._getObservationRowColumnTemplate(observation)
      }
    }
    else if (observation.DataType == 7) {
      column = {
        prop: observation._columnId,
        name: `${observation.Name}`,
        dataType: observation.DataType,
        minWidth: this.setColumnsMinWidth(observation.DataType),
        width: this.setColumnsMinWidth(observation.DataType),
        cellTemplate: this._getObservationRowColumnTemplate(observation)
      }
    }
    else {
      column = {
        prop: observation._columnId,
        name: `${observation.Name}`,
        dataType: observation.DataType,
        cellTemplate: this._getObservationRowColumnTemplate(observation)
      }
    }

    this.table.columns.push(column);
    /* mapping column keys and indexes ... */
    this._updateColumnIndexes();
    /* NOTE: fix for forcing ren der of dynamic columns... */
    this.table.columns = [...this.table.columns];
    // render rows for current observation values ...
    this._onObservationValuesChange(device, observation, observation._values.getValue());
    // subscribe to value changes and render rows ...
    var subscriptions = (this.subscriptions[observation._columnId] = this.subscriptions[observation._columnId] || []);
    subscriptions.push(observation._values.valueChanges.subscribe((values: any[]) => this._onObservationValuesChange(device, observation, values)));
    subscriptions.push(observation._values.itemsAdded.subscribe((values: any[]) => this._onObservationValuesChange(device, observation, values, true)));
  }

  private setColumnsMaxWidth(dataType: any): number{
    
    let columnMaxWidth: number;

    switch(dataType) {
      case 0: { 
        columnMaxWidth = 230; 
        break; 
      }
      case 2: { 
        columnMaxWidth = 100;
        break;
      }
      case 5: { 
        columnMaxWidth = 450;
        break;
      }
      case 7: { 
        columnMaxWidth = 550;
        break;
      }
   } 

    return columnMaxWidth;
  }

  private setColumnsMinWidth(dataType: any): number{
    
    let columnMinWidth: number;

    switch(dataType) {
      case 0: { 
        columnMinWidth = 230; 
        break; 
      }
      case 2: { 
        columnMinWidth = 100;
        break;
      } 
      case 5: { 
        columnMinWidth = 450;
        break;
      }
      case 7: { 
        columnMinWidth = 550;
        break;
      }
   } 

    return columnMinWidth;
  }

  public removeDeviceObservation(device: any, observation: any): void {
    /* skip id device is not found ... */
    if (!(device = (this.graphicOptions.devices = this.graphicOptions.devices || {})[device.MID])) { return; }
    /* if observation is found, remove it and all its related table assests.. */
    if ((observation = (device._selectedObservations = device._selectedObservations || {})[observation.Id])) {

      /* unsubscribing all observation observers ... */
      var subscriptions = (this.subscriptions[(observation._columnId || null)] || null);
      if (subscriptions) {
        subscriptions.forEach(m => m.unsubscribe());
        delete this.subscriptions[observation._columnId];
      }

      // deleting column, its index and updating indexes of tailing items....
      this.table.columns.splice(this.table.columnIndexes[observation._columnId], 1);
      this._updateColumnIndexes();
      // deleting row values of observation...    
      this._removeObservationValueRows(observation);
      // deleteing observation ...
      delete device._selectedObservations[observation.Id];
      /* NOTE: fix for forcing ren der of dynamic columns... */
      this.table.columns = [...this.table.columns];
    }

    /* delete device if, no observations remaining after removing the current observation... */
    if (!Object.keys(device._selectedObservations).length) { delete this.graphicOptions.devices[device.MID]; }
  }

  public clearRows(): void {
    if(!this.table) { return; }
    this.table.rows.splice(0, this.table.rows.length);
  }

  public ngOnInit(): void {
    (this.graphicOptions = this.graphicOptions || {}).devices = {};
    this.table = {
      rows: [],
      columns: this._getDefaultColumns(),
      columnIndexes: {}
    };
    this._updateColumnIndexes();
  }

  ngOnDestroy(): void {
    Object.keys(this.graphicOptions.devices || {}).forEach(m => {
      Object.keys(this.graphicOptions.devices[m]._selectedObservations || {}).forEach(n => this.removeDeviceObservation(this.graphicOptions.devices[m], this.graphicOptions.devices[m]._selectedObservations[n]));
    });
  }
}
