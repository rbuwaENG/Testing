import * as moment from 'moment';
import {
  Component,
  Input,
  Output,
  ViewChild,
  TemplateRef,
  OnDestroy,
  ChangeDetectorRef,
  ViewEncapsulation,
} from '@angular/core';

/* importing internals ... */
import { BasePlottableComponent } from '../base.plottable.component';
import { ObservationDataType } from '../../../core/enums';
import { ObservationStruct, DeviceStruct } from '../../../core/models';
import { StringExtension } from '../../../core/extensions';
import { ObservationStatOverflowDialog } from 'src/app/analyzer/observations-table/observation-stat-dialog.component';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { AnySrvRecord } from 'dns';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { DeviceService, TemplateService } from 'src/app/services';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';
import { NumberConstants } from 'src/app/core/constants/number.constants';

@Component({
  selector: 'app-infograph-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class TableComponent
  extends BasePlottableComponent
  implements OnDestroy
{
  @ViewChild('postitionTypedColumnTemplate')
  protected postitionTypedColumnTemplate: TemplateRef<any>;

  @ViewChild('timestampColumnTemplate')
  protected timestampColumnTemplate: TemplateRef<any>;

  @ViewChild('statisticsTypedColumnTemplate')
  protected statisticsTypedColumnTemplate: TemplateRef<any>;

  @Input()
  public graphicOptions: any;
  @Input()
  public from: moment.Moment;
  @Input()
  public to: moment.Moment;

  protected subscriptions: any;
  @Output()
  public table: any;
  quantities: QuantityItem[];

  constructor(
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
    private cache: LocalStorageService,
    private templateService: TemplateService,
    protected deviceService: DeviceService
  ) {
    super();
    this.subscriptions = {};
    this.getTemplateUnits();
  }

  getTemplateUnits() {
    this.quantities = this.cache.getQuantities();
    if (!this.quantities) {
      this.templateService.getUnits().subscribe((data) => {
        this.quantities = data['Quantities'] as QuantityItem[];
        this.cache.setQuantities(this.quantities);
      });
    }
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
      right: '',
    },
  };
  open(row, rowIndex, record) {
    this.dialogRef = this.dialog.open(
      ObservationStatOverflowDialog,
      this.config
    );
    let value = '';
    if (row != null) {
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
      Timestamp: row.timestamp,
    };

    this.dialogRef.componentInstance.details = this.obsDetails;

    this.dialogRef.afterClosed().subscribe((result) => {
      this.lastCloseResult = result;
      this.dialogRef = null;
      this.obsDetails = null;
    });
  }

  private _getObservationRowColumnId(
    device: DeviceStruct,
    observation: ObservationStruct
  ): string {
    return StringExtension.toSnakeCase(`${device.MID}_${observation.Id}`);
  }
  private _getObservationRowColumnTemplate(
    observation: ObservationStruct | any
  ): TemplateRef<any> {
    if (observation.DataType === ObservationDataType.Position) {
      return this.postitionTypedColumnTemplate;
    } else if (observation.DataType === ObservationDataType.Statistics) {
      return this.statisticsTypedColumnTemplate;
    } else {
      return null;
    }

    // return (observation.DataType === ObservationDataType.Position) ? this.postitionTypedColumnTemplate : null;
  }
  private _getDefaultColumns(): any[] {
    return [
      {
        prop: 'timestamp',
        name: 'Time',
        dataType: ObservationDataType.Unknown,
        cellTemplate: this.timestampColumnTemplate,
      },
    ];
  }

  private _updateColumnIndexes() {
    this.table.columnIndexes = this.table.columns.reduce(
      (result, current, index) =>
        Object.assign(result, JSON.parse(`{"${current.prop}": ${index}}`)),
      {}
    );
  }

  private _onObservationValuesChange(
    device: DeviceStruct | any,
    observation: ObservationStruct | any,
    values: any[],
    append: boolean = false
  ) {
    var time = moment();
    /* remove all existing row values of observation if not appending .... */
    if (!append) {
      this._removeObservationValueRows(observation);
    }
    /* adding or updating row with observation value ... */
    values = this.formatDateValueToReadableFormatForTable(values);

    // get enumerations of current device
    let enumGroups = this.cache.getDeviceEnumerations(device.MID);

    values.forEach((value) => {
      let index = this.table.rows.findIndex(
        (m) => m.timestamp === value.Timestamp
      );
      if (index < 0) {
        index = this.table.rows.push({ timestamp: value.Timestamp }) - 1;
      }

      // find enumeration group related to observation
      let enumerationName: string = null;
      if (observation.Quantity === NumberConstants.EnumerationGroupQuantityId) { // is Enumerations
        enumerationName = enumGroups.find((x) => x.Id === observation.Unit)
          ?.Items.find(item => item.Id == value.Value).Name;
      }

      this.table.rows[index][observation._columnId] = `${value.Value} ${enumerationName ? ' / ' + enumerationName : ''}`;
    });
    //this.table.rows.push(this.table.rows);
    this.table.rows = [...this.table.rows];
    this.cd.detectChanges();
  }

  formatDateValueToReadableFormatForTable(values) {
    if (values != []) {
      values.forEach((row) => {
        if (row.Timestamp != null) {
          let value = moment(row.Timestamp)
            .utc()
            .format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
          row.Timestamp = value;
          if (row.Value == '' && row.Value != '0') {
            row.Value = "<span class='empty'>empty</span>";
          }
        }
      });
      return values;
    }
  }

  private _removeObservationValueRows(
    observation: ObservationStruct | any,
    values?: any[]
  ) {
    /* NOTE: this is very COSTLY function as it iterates throw all the rows. This is intended to be used when remove columns.
    If you are using this for setting new values for all columns. Its best you use "clearRows()" before setting new values ... */
    //var defaultColumnsCount = this._getDefaultColumns().length;
    var otherColumns = [
      ...this._getDefaultColumns().map((m) => m.prop),
      observation._columnId,
    ];
    otherColumns = this.table.columns
      .map((m) => m.prop)
      .filter((m) => otherColumns.indexOf(m) < 0);
    var index = -1;
    values = values || observation._values.getValue();
    var time = moment();

    this.table.rows
      .filter((m) => m.hasOwnProperty(observation._columnId))
      .filter((m) => values.findIndex((n) => n.Timestamp === m.timestamp) >= 0)
      .forEach((row) => {
        if ((index = this.table.rows.indexOf(row)) < 0) {
          return;
        }
        // delete property is row has any key other than current column ...
        // else delete row from array ...
        if (
          Object.keys(this.table.rows[index]).some(
            (m) => otherColumns.indexOf(m) >= 0
          )
        ) {
          return delete this.table.rows[index][observation._columnId];
        }
        this.table.rows.splice(index, 1);
        // this.table.rows = [...this.table.rows];
      });
  }

  public addDeviceObservation(
    device: DeviceStruct | any,
    observation: ObservationStruct | any
  ): void {
    /* add device and observation if they already weren't. and retreive them by their reference.. */
    device =
      (this.graphicOptions.devices = this.graphicOptions.devices || {})[
        device.MID
      ] || (this.graphicOptions.devices[device.MID] = device);
    observation =
      (device._selectedObservations = device._selectedObservations || {})[
        observation.Id
      ] || (device._selectedObservations[observation.Id] = observation);

    /* create columnId and map its index ... */
    observation._columnId = this._getObservationRowColumnId(
      device,
      observation
    );
    observation = this.setAbbreviation(observation);

    let name = `${device.MID} - ${observation.Name}`;
    if (observation.UnitAbbreviation) {
      name = `${device.MID} - ${observation.Name} (${observation.UnitAbbreviation})`;
    }

    this.table.columns.push({
      prop: observation._columnId,
      name: name,
      dataType: observation.DataType,
      cellTemplate: this._getObservationRowColumnTemplate(observation),
    });
    /* mapping column keys and indexes ... */
    this._updateColumnIndexes();
    /* NOTE: fix for forcing ren der of dynamic columns... */
    this.table.columns = [...this.table.columns];

    // render rows for current observation values ...
    this._onObservationValuesChange(
      device,
      observation,
      observation._values.getValue()
    );
    // subscribe to value changes and render rows ...
    var subscriptions = (this.subscriptions[observation._columnId] =
      this.subscriptions[observation._columnId] || []);
    subscriptions.push(
      observation._values.valueChanges.subscribe((values: any[]) =>
        this._onObservationValuesChange(device, observation, values)
      )
    );
    subscriptions.push(
      observation._values.itemsAdded.subscribe((values: any[]) =>
        this._onObservationValuesChange(device, observation, values, true)
      )
    );
  }

  setAbbreviation(observation: any): any {
    let unit = null;
    let quantity = this.quantities.find((x) => x.Id === observation.Quantity);
    if (quantity.Units) {
      unit = quantity.Units.find((x) => x.Id === observation.Unit);
      observation.UnitAbbreviation = unit.Abbreviation;
    } else {
      observation.UnitAbbreviation = null;
    }

    return observation;
  }

  public removeDeviceObservation(device: any, observation: any): void {
    /* skip id device is not found ... */
    if (
      !(device = (this.graphicOptions.devices =
        this.graphicOptions.devices || {})[device.MID])
    ) {
      return;
    }
    /* if observation is found, remove it and all its related table assests.. */
    if (
      (observation = (device._selectedObservations =
        device._selectedObservations || {})[observation.Id])
    ) {
      /* unsubscribing all observation observers ... */
      var subscriptions =
        this.subscriptions[observation._columnId || null] || null;
      if (subscriptions) {
        subscriptions.forEach((m) => m.unsubscribe());
        delete this.subscriptions[observation._columnId];
      }

      // deleting column, its index and updating indexes of tailing items....
      this.table.columns.splice(
        this.table.columnIndexes[observation._columnId],
        1
      );
      this._updateColumnIndexes();
      // deleting row values of observation...
      this._removeObservationValueRows(observation);
      // deleteing observation ...
      delete device._selectedObservations[observation.Id];
      /* NOTE: fix for forcing ren der of dynamic columns... */
      this.table.columns = [...this.table.columns];
    }

    /* delete device if, no observations remaining after removing the current observation... */
    if (!Object.keys(device._selectedObservations).length) {
      delete this.graphicOptions.devices[device.MID];
    }
  }

  public clearRows(): void {
    if (!this.table) {
      return;
    }
    this.table.rows.splice(0, this.table.rows.length);
  }

  public ngOnInit(): void {
    (this.graphicOptions = this.graphicOptions || {}).devices = {};
    this.table = {
      rows: [],
      columns: this._getDefaultColumns(),
      columnIndexes: {},
    };
    this._updateColumnIndexes();
  }

  ngOnDestroy(): void {
    Object.keys(this.graphicOptions.devices || {}).forEach((m) => {
      Object.keys(
        this.graphicOptions.devices[m]._selectedObservations || {}
      ).forEach((n) =>
        this.removeDeviceObservation(
          this.graphicOptions.devices[m],
          this.graphicOptions.devices[m]._selectedObservations[n]
        )
      );
    });
  }
}
