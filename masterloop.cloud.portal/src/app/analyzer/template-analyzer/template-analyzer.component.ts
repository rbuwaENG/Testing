import { Component, OnInit, ViewContainerRef, ViewChild } from '@angular/core';
import {
  DeviceService,
  LoggerService,
  DialogsService,
  AppSettings,
  TemplateService,
} from '../../services';
import { dataTypes } from '../../core/constants/dataType-names';
import { DataConvertion } from './../../common/dataconvertion';
import { LocalStorageKeys } from '../../core/constants';
import { ObservationSelectedTableComponent } from './../../devices/data-category/observations-table-selected/table/table.component';
import { templateAnalyzerText as text } from '../../core/constants/template-analyzer-text';
import { TemplateAnalyzerMasterComponent } from '../template-analyzer-master.component';
import { LocalStorageService } from '../../services/local-storage.service';
import { ExportToCsv } from 'export-to-csv';
import { FilterDialogComponent } from './filter-dialog/filter-dialog.component';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';

@Component({
  selector: 'app-template-analyzer',
  templateUrl: './template-analyzer.component.html',
  styleUrls: ['./template-analyzer.component.scss'],
})
export class TemplateAnalyzerComponent
  extends TemplateAnalyzerMasterComponent
  implements OnInit {
  @ViewChild('myTable') table: any;

  @ViewChild(ObservationSelectedTableComponent)
  isOpen: boolean = true;
  dataConversion = new DataConvertion();
  templates: any;
  templateId: any;
  observations = [];
  settings = [];
  tableSettings = [];
  selectedObservations = [];
  selectedSettings = [];
  mapOservations = [];
  checkedObservations = [];
  checkedSettings = [];
  allDevices: any;
  exportData = [];
  @ViewChild('optionsnav') sideNav: any;
  text = text;
  arrangedExportData = [];
  arrangedColumnHeaders = [];
  templateInfo: any;
  /**
   * Group, Filter related changes
   */
  groupByObservations: any;
  groupById: any;
  disableSelect: boolean = false;
  setFilters = [];
  filterImage: any;
  finalObservations = [];
  groupByName: any;
  groupByColumnName: any;
  quantities: QuantityItem[] = [];

  constructor(
    appSettings: AppSettings,
    loggerService: LoggerService,
    deviceService: DeviceService,
    protected dialogService: DialogsService,
    protected viewContainerRef: ViewContainerRef,
    protected cache: LocalStorageService,
    private templateService: TemplateService,
    public dialog: MatDialog,
    protected dbService: NgxIndexedDBService
  ) {
    super(appSettings, loggerService, deviceService);
  }

  dialogRef: MatDialogRef<FilterDialogComponent>;
  config: MatDialogConfig = {
    disableClose: false,
    width: '350px',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
  };

  ngOnInit() {
    this.filterImage = 'filter_inactive.png';
    this.isOpen = true;
    let templates = JSON.parse(
      localStorage.getItem(LocalStorageKeys.CACHED_TEMPLATES)
    );
    if (templates == null) {
      this.getAllTemplates();
    } else {
      this.templates = templates.sort((a: any, b: any) =>
        a.Id.localeCompare(b.Id)
      );
    }
    this.templateService.getQuantities().subscribe((quantities) => {
      this.quantities = quantities;
    });
  }

  addFilter(row, rowIndex) {
    this.dialogRef = this.dialog.open(FilterDialogComponent, this.config);

    let filterExist = this.setFilters.find((x) => x.ObservationId == row.Id);

    if (filterExist != null) {
      row.Condition = filterExist.Condition;
      row.Value = filterExist.Value;
    }
    this.dialogRef.componentInstance.observation = row;
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result != null) {
        var index = this.setFilters.findIndex((x) => x.ObservationId == row.Id);
        if (index > -1) {
          this.setFilters.splice(index, 1);
        }
        if (result.SetFilter) {
          this.setFilters.push(result);
          this.observations[rowIndex]['Filter'] = true;
          this.observations = [...this.observations];
        } else {
          row.Condition = null;
          row.Value = null;
          this.observations[rowIndex]['Filter'] = false;
          this.observations = [...this.observations];
        }
      }
    });
  }

  onGroupBySelect(event) {
    let exist = this.selectedObservations.includes(this.groupById);
    if (!exist) {
      this.selectedObservations.push(this.groupById);
    }
  }

  getAllTemplates() {
    this.templateService.getTemplates().subscribe(
      (data) => {
        this.templates = data.sort((a: any, b: any) =>
          a.Id.localeCompare(b.Id)
        );
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting templates failed.');
      }
    );
  }

  onTemplateSelect() {
    this.clearAllValues();
    this.getTemplateDetailsById();
  }

  getTemplateDetailsById() {
    this.templateService.getTemplateDetails(this.templateId).subscribe(
      (data) => {
        this.templateInfo = data;
        this.observations = data.Observations;
        this.settings = data.Settings;
        this.observations.forEach((element) => {
          element.DataType = this.dataConversion.convertDataTypes(
            element.DataType
          );
          element['IsEnable'] = false;
        });
        this.settings.forEach((element) => {
          element.DataType = this.dataConversion.convertDataTypes(
            element.DataType
          );
          element['IsEnable'] = false;
        });
        //Groupby observations
        this.groupByObservations = data.Observations;
        this.disableSelect = false;
        // console.log(this.groupByObservations);
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting template details failed.');
      }
    );
  }

  onCheckObservationsEvent(event, row) {
    let maxObs = 10;
    this.checkedObservations[row.$$index] = event;
    //this.observations[row.$$index].IsEnable = event;
    if (this.selectedObservations != null) {
      if (event) {
        if (this.selectedObservations.length < maxObs) {
          if (row.Id != this.groupById) {
            let exist = this.selectedObservations.includes(row.Id);
            if (!exist) {
              this.selectedObservations.push(row.Id);
            }
          }
        } else {
          //this.observations[row.$$index].IsEnable = false;
          this.checkedObservations[row.$$index] = false;
          this.getTemplateDetailsById();
          this.loggerService.showWarningMessage(text.ObservationWarning);
        }
      } else {
        if (row.Id != this.groupById) {
          this.selectedObservations = this.selectedObservations.filter(
            (item) => item !== row.Id
          );
        }
      }
    }
    // console.log(this.selectedObservations);
  }

  onCheckSettingsEvent(event, row, rowIndex) {
    let maxSettings = 10;
    this.checkedSettings[rowIndex] = event;
    if (this.selectedSettings != null) {
      if (event) {
        if (this.selectedSettings.length < maxSettings) {
          this.selectedSettings.push(row.Id);
        } else {
          this.checkedSettings[rowIndex] = false;
          this.getTemplateDetailsById();
          this.loggerService.showWarningMessage(text.SettingWarning);
        }
      } else {
        this.selectedSettings = this.selectedSettings.filter(
          (item) => item !== row.Id
        );
      }
    }
  }

  createReport() {
    this.resetAnalyzerTable();
    this.getDevicesAndMids();
  }

  getDevicesAndMids() {
    this.dbService.count('devices').subscribe((recordCount) => {
      if (recordCount == 0) {
        this.deviceService
          .getDeviceMetaAndDeviceData('false', 'true')
          .subscribe((devices) => {
            // this.updateDeviceList(devices);
            //insert devices into IDB
            this.dbService
              .add('devices', {
                Value: devices,
              })
              .subscribe((storeData) => {
                this.dbService.getAll('devices').subscribe((devices) => {
                  if (devices[0].Value != null) {
                    this.allDevices = devices[0].Value;
                    let request = this.getRequest();
                    if (
                      request.ObservationIds.length == 0 &&
                      request.SettingIds.length == 0
                    ) {
                      this.loggerService.showWarningMessage(
                        text.NoObservationsAndSettings
                      );
                    } else if (request.MIDs.length == 0) {
                      this.loggerService.showWarningMessage(text.NoDevices);
                    } else {
                      this.sideNav.close();
                      this.getSnapshotValues(request);
                      this.arrangeColumnHeaders();
                    }
                  }
                });
              });
          });
      } else {
        this.dbService.getAll('devices').subscribe((devices) => {
          if (devices[0].Value != null) {
            this.allDevices = devices[0].Value;
            let request = this.getRequest();
            if (
              request.ObservationIds.length == 0 &&
              request.SettingIds.length == 0
            ) {
              this.loggerService.showWarningMessage(
                text.NoObservationsAndSettings
              );
            } else if (request.MIDs.length == 0) {
              this.loggerService.showWarningMessage(text.NoDevices);
            } else {
              this.sideNav.close();
              this.getSnapshotValues(request);
              this.arrangeColumnHeaders();
            }
          }
        });
      }
    });
  }

  // create api request
  getRequest(): any {
    let mids = this.getDevicesByTemplateId(this.templateId);
    let observations = this.selectedObservations;
    let settings = this.selectedSettings;
    let request = {
      MIDs: mids.MIDS,
      ObservationIds: observations,
      SettingIds: settings,
    };
    return request;
  }

  getSnapshotValues(request: any) {
    this.deviceService.getSnapshot(request).subscribe(
      (data) => {
        this.filterObservations(data);
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting snapshot values failed.');
      }
    );
  }

  arrangeColumnHeaders() {
    this.arrangedColumnHeaders = [];
    this.arrangedExportData = [];
    let columns = [];
    this.templateInfo.Observations.forEach((observation) => {
      if (this.selectedObservations.length > 0) {
        this.selectedObservations.forEach((id) => {
          if (observation.Id == id) {
            if (observation.DataType == dataTypes.Position) {
              columns.push('O-' + observation.Name + '-Latitude');
              columns.push('O-' + observation.Name + '-Longitude');
              columns.push('O-' + observation.Name + '-Altitude');
            } else {
              columns.push('O-' + observation.Name);
            }
          }
        });
      }
    });
    this.templateInfo.Settings.forEach((setting) => {
      if (this.selectedSettings.length > 0) {
        this.selectedSettings.forEach((id) => {
          if (setting.Id == id) {
            columns.push('S-' + setting.Name);
          }
        });
      }
    });
    if (columns.length > 0) {
      columns.sort();
      this.arrangedColumnHeaders.push(columns);
    }
  }

  filterObservations(data) {
    let tempArray = [...data];
    if (this.setFilters.length > 0) {
      tempArray.forEach((element) => {
        if (element.Observations != null) {
          //console.log(element.Observations);
          // let filterExist = this.setFilters.find(x =>x.ObservationId == obs.Id);
          element.Observations.forEach((obs) => {
            //console.log(obs);
            let filterExist = this.setFilters.find(
              (x) => x.ObservationId == obs.Id
            );

            if (filterExist != null) {
              //console.log(filterExist,'==>',obs.Id);
              let condition = filterExist.Condition;
              //console.log(condition, '', filterExist.Value);
              switch (condition) {
                case 'equal':
                  if (obs.Value == filterExist.Value) {
                    //console.log('equal',obs.Value);
                    obs.Value = obs.Value;
                  } else {
                    obs.Value = '';
                  }
                  break;
                case 'less':
                  if (obs.Value < filterExist.Value) {
                    //console.log('less',obs.Value);
                    obs.Value = obs.Value;
                  } else {
                    obs.Value = '';
                  }
                  break;
                case 'greater':
                  if (obs.Value > filterExist.Value) {
                    // console.log('greater',obs.Id,obs.Value,filterExist.Value);
                    obs.Value = obs.Value;
                  } else {
                    obs.Value = '';
                  }
                  break;
                case 'lessEqual':
                  if (obs.Value <= filterExist.Value) {
                    //console.log('lessEqual',obs.Value);
                    obs.Value = obs.Value;
                  } else {
                    obs.Value = '';
                  }
                  break;
                case 'greaterEqual':
                  if (obs.Value >= filterExist.Value) {
                    //console.log('greaterEqual',obs.Value);
                    obs.Value = obs.Value;
                  } else {
                    obs.Value = '';
                  }
                  break;
              }
            }
          });
        }
      });
      // this.mapObservations(data);
    }
    // console.log('filtered Array',tempArray);
    // if(this.groupById != null) {
    //   this.groupBySelectedObservation(tempArray, this.groupById);
    // }
    this.mapObservations(tempArray);
  }

  mapObservations(data: any) {
    let mapOservations = [];
    //this.filterObservations(data);
    this.convertCsvDownloadableData(data);

    data.forEach((element) => {
      if (element.Observations != null) {
        element.Observations.forEach((obs) => {
          if (obs.DataType == 6) {
            let name = this.getObservationById(obs.Id).Name;
            let value = '';
            if (obs.Value == '') {
              value = 'empty';
            } else {
              value = obs.Value;
            }
            mapOservations.push({
              MID: element.MID,
              DeviceName: this.getDeviceByMid(element.MID),
              DataType: obs.DataType,
              Id: obs.Id,
              //Timestamp: obs.Timestamp,
              Name: name,
              //[name] : obs.Value,
              Value: value,
            });
          } else {
            let name = this.getObservationById(obs.Id).Name;
            mapOservations.push({
              MID: element.MID,
              DeviceName: this.getDeviceByMid(element.MID),
              DataType: obs.DataType,
              Id: obs.Id,
              //Timestamp: obs.Timestamp,
              Name: name,
              //[name] : obs.Value,
              Value: obs.Value,
            });
          }
        });
      } else {
        mapOservations.push({
          MID: element.MID,
          DeviceName: this.getDeviceByMid(element.MID),
        });
      }
      if (element.Settings != null) {
        element.Settings.forEach((setting) => {
          let name = this.getSettingById(setting.Id).Name;
          mapOservations.push({
            MID: element.MID,
            DeviceName: this.getDeviceByMid(element.MID),
            DataType: setting.DataType,
            Id: setting.Id,
            //Timestamp: setting.Timestamp,
            Name: name,
            //[name] : setting.Value,
            Value: setting.Value,
          });
        });
      } else {
        mapOservations.push({
          MID: element.MID,
          DeviceName: this.getDeviceByMid(element.MID),
        });
      }
    });

    this.getColumnsAndSettings();
    this.mapOservations = mapOservations;
    this.mapGroupedValues();
    this.manageUndefinedColums();
    this.exportData = this.mapOservations;

    // console.log('group ',this.groupById);
    // console.log('obser', this.observations);

    if (this.groupById != null) {
      var column = this.observations.filter((x) => x.Id == this.groupById);
      if (column != null) {
        let groupBy = column[0].Name;
        this.groupByColumnName = groupBy;

        this.groupByName = groupBy.replace(/\s/g, '');

        let data = [...this.mapOservations];

        let groupedData = [];

        let grouped = data.reduce(function (a, e) {
          let estKey = e[groupBy];

          (a[estKey] ? a[estKey] : (a[estKey] = null || [])).push(e);
          return a;
        }, {});

        // console.log('grouped', grouped);

        for (let i in grouped) {
          let group = grouped[i];
          groupedData.push(group);
        }
        groupedData.forEach((group) => {
          group.forEach((item) => {
            this.finalObservations.push(item);
          });
        });
        this.finalObservations = [...this.finalObservations];
      }

      // console.log('dtat loaded',this.finalObservations);
    } else {
      this.finalObservations = this.mapOservations;
      this.finalObservations = [...this.finalObservations];
    }
  }

  getGroupRowHeight(group, rowHeight) {
    let style = {};

    style = {
      height: group.length * 40 + 'px',
      width: '100%',
    };

    return style;
  }

  toggleExpandGroup(group) {
    // console.log('Toggled Expand Group!', group);
    this.table.groupHeader.toggleExpandGroup(group);
  }

  onDetailToggle(event) {
    // console.log('Detail Toggled', event);
  }

  toggleExpandRow(row) {
    // console.log('Toggled Expand Row!', row);
    this.table.rowDetail.toggleExpandRow(row);
  }

  convertCsvDownloadableData(values) {
    let dataForCsvExport = [];
    values.forEach((element) => {
      let exportValues = [];
      exportValues['MID'] = element.MID;
      exportValues['DeviceName'] = this.getDeviceByMid(element.MID);
      exportValues['Settings'] = [];
      exportValues['Observations'] = [];
      if (element.Observations != null) {
        let observations = [];
        element.Observations.forEach((obs) => {
          let data = [];
          let name = this.getObservationById(obs.Id).Name;
          data['Name'] = name;
          data['DataType'] = obs.DataType;
          data['Id'] = obs.Id;
          data['Value'] = obs.Value;

          observations.push(data);
        });

        exportValues['Observations'] = observations;
      }
      if (element.Settings != null) {
        let settings = [];
        element.Settings.forEach((setting) => {
          let data = [];
          let name = this.getSettingById(setting.Id).Name;
          data['Name'] = name;
          data['DataType'] = setting.DataType;
          data['Id'] = setting.Id;
          data['Value'] = setting.Value;

          settings.push(data);
        });
        exportValues['Settings'] = settings;
      }
      dataForCsvExport.push(exportValues);
    });
    this.convertColumnsByDataType(dataForCsvExport);
  }

  convertColumnsByDataType(data) {
    let arrangedArray = [];
    data.forEach((value) => {
      let singleObs = [];
      singleObs['MID'] = value.MID;
      singleObs['Name'] = value.DeviceName;
      value.Observations.forEach((observation) => {
        if (observation.DataType == 1) {
          singleObs['O-' + observation.Name] = observation.Value;
        } else if (observation.DataType == 2) {
          singleObs['O-' + observation.Name] = Number(observation.Value);
        } else if (observation.DataType == 3) {
          singleObs['O-' + observation.Name] = Number(observation.Value);
        } else if (observation.DataType == 4) {
          singleObs['O-' + observation.Name] = Number(observation.Value);
        } else if (observation.DataType == 5) {
          let ObsNameLat = `O-${observation.Name}-Latitude`;
          let ObsNameLong = `O-${observation.Name}-Longitude`;
          let ObsNameAlt = `O-${observation.Name}-Altitude`;
          let positionValues = observation.Value.split(',');
          singleObs[ObsNameLat] = Number(positionValues[0]);
          singleObs[ObsNameLong] = Number(positionValues[1]);
          singleObs[ObsNameAlt] = Number(positionValues[2]);
        } else if (observation.DataType == 6) {
          singleObs['O-' + observation.Name] = observation.Value;
        } else {
          singleObs['O-' + observation.Name] = observation.Value;
        }
      });
      value.Settings.forEach((setting) => {
        if (setting.DataType == 1) {
          singleObs['S-' + setting.Name] = setting.Value;
        } else if (setting.DataType == 2) {
          singleObs['S-' + setting.Name] = Number(setting.Value);
        } else if (setting.DataType == 3) {
          singleObs['S-' + setting.Name] = Number(setting.Value);
        } else if (setting.DataType == 4) {
          singleObs['S-' + setting.Name] = Number(setting.Value);
        } else {
          singleObs['S-' + setting.Name] = setting.Value;
        }
      });
      arrangedArray.push(singleObs);
    });
    this.arrangedExportData = arrangedArray;
  }
  //Add column name for undefined properties
  manageUndefinedColums() {
    this.mapOservations.forEach((mapObs) => {
      let columns = [];
      this.tableSettings.forEach((element) => {
        let item = { Name: element.Header };
        columns.push(item);
      });
      for (let i = columns.length - 1; i >= 0; i--) {
        let column = columns[i];
        if (typeof mapObs[column.Name] == 'undefined') {
          //set empty for undefined values
          mapObs[column.Name] = '';
          const index: number = columns.indexOf(column);
          if (index !== -1) {
            //delete column from temp column list, after replace with undefined
            columns.splice(index, 1);
          }
        }
      }
    });
  }

  // create analyzer data table rows
  mapGroupedValues() {
    let groupItems = this.groupByMid(this.mapOservations);
    let result = [];
    groupItems.forEach((element) => {
      var data = {
        MID: element[0].MID,
        //Timestamp: element[0].Timestamp,
        DeviceName: element[0].DeviceName,
        DataType: element[0].DataType,
      };
      element.forEach((item) => {
        data[item.Name] = item.Value;
      });
      result.push(data);
    });
    this.mapOservations = result;
    //sorted by mid
    this.mapOservations.sort((a: any, b: any) => a.MID.localeCompare(b.MID));
  }

  // group by mid of snapshot api data
  groupByMid(collection: any): any {
    let property = 'MID';
    var i = 0,
      val,
      index,
      values = [],
      result = [];
    for (; i < collection.length; i++) {
      val = collection[i][property];
      index = values.indexOf(val);
      if (index > -1) result[index].push(collection[i]);
      else {
        values.push(val);
        result.push([collection[i]]);
      }
    }
    return result;
  }

  getColumnsAndSettings() {
    this.tableSettings = [];
    if (this.selectedObservations != null) {
      this.selectedObservations.forEach((element) => {
        let obs = this.getObservationById(element);
        let tableColumnSetting = this.getTableColumnSetting(obs.Name, obs.Quantity, obs.Unit, obs.DataType, 'O')
        this.tableSettings.push(tableColumnSetting);
      });
    }
    if (this.selectedSettings != null) {
      this.selectedSettings.forEach((element) => {
        let setting = this.getSettingById(element);
        let tableColumnSetting = this.getTableColumnSetting(setting.Name, setting.Quantity, setting.Unit, setting.DataType, 'S')
        this.tableSettings.push(tableColumnSetting);
      });
    }
  }

  getTableColumnSetting(name: string, quantityId: number, unitId: number, dataType: string, type: string) {
    let unitAbbreviation = this.templateService.getAbbreviation(this.quantities, quantityId, unitId);
    return {
      Header: name,
      Type: type,
      Settings: this.getTableSettingsByDataType(dataType),
      UnitAbbreviation: unitAbbreviation
    };
  }

  getTableHeaderName(type: string, header: string, unitAbbreviation: string) {
    if (unitAbbreviation) {
      return `${type} - ${header} (${unitAbbreviation})`;
    } else {
      return `${type} - ${header}`
    }
  }

  getDevicesByTemplateId(templateId: string): any {
    let devices = [];
    let mids = [];
    if (this.allDevices != null) {
      this.allDevices.forEach((element) => {
        if (templateId == element.TemplateId) {
          let device = {};
          mids.push(element.MID);
          device['MID'] = element.MID;
          device['Name'] = element.Name;
          devices.push(device);
        }
      });
    }
    devices['MIDS'] = mids;
    return devices;
  }

  /* OLD IMPLEMENTATION */
  getDevicesByTemplateIds(templateId: string): any {
    let devices = [];
    let mids = [];
    //get all devices from local storage or global variable for mapping with the template
    this.allDevices = this.cache.getAllDevices();
    if (this.allDevices == null) {
      //get all devices by API
      this.getAllDevices();
    }
    if (this.allDevices != null) {
      this.allDevices.forEach((element) => {
        if (templateId == element.TemplateId) {
          let device = {};
          mids.push(element.MID);
          device['MID'] = element.MID;
          device['Name'] = element.Name;
          devices.push(device);
        }
      });
    }
    devices['MIDS'] = mids;
    return devices;
  }

  getDeviceByMid(mid: string): string {
    let device = this.allDevices.filter((item) => item.MID == mid);
    return device[0].Name;
  }

  getAllDevices() {
    this.deviceService.getDeviceMetaAndDeviceData('false', 'true').subscribe(
      (data) => {
        this.allDevices = data;
        this.cache.createDeviceLocalStorage(data);
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting all devices failed.');
      }
    );
  }

  clearAllValues() {
    this.selectedObservations = [];
    this.selectedSettings = [];
    this.tableSettings = [];
    this.mapOservations = [];
    this.observations = [];
    this.checkedObservations = [];
    this.checkedSettings = [];
  }

  resetAnalyzerTable() {
    this.tableSettings = [];
    this.mapOservations = [];
    this.finalObservations = [];
  }

  getTableSettingsByDataType(dataType: string): any {
    let setings = { MaxWidth: 200, Flex: 1 };
    switch (dataType) {
      case dataTypes.Position: {
        setings.MaxWidth = 400;
        break;
      }
      case dataTypes.String: {
        setings.MaxWidth = 300;
        break;
      }
      case dataTypes.Double: {
        setings.MaxWidth = 300;
        break;
      }
      case dataTypes.Integer: {
        setings.MaxWidth = 200;
        break;
      }
      case dataTypes.Boolean || dataTypes.Binary: {
        setings.MaxWidth = 200;
        setings.Flex = 0.5;
        break;
      }
    }
    return setings;
  }

  getObservationById(id: number): any {
    let observation = this.observations.filter((item) => item.Id == id);
    return observation[0];
  }

  getSettingById(id: number): any {
    let observation = this.settings.filter((item) => item.Id == id);
    return observation[0];
  }

  downloadCSV() {
    if (this.exportData.length == 0) {
      this.loggerService.showErrorMessage(
        'Please select obsevations or settings and create table before export.'
      );
    } else {
      const options = {
        filename: this.templateId,
        fieldSeparator: ',',
        quoteStrings: '"',
        decimalSeparator: '.',
        showLabels: false,
        showTitle: false,
        //title: 'Template Result',
        useTextFile: false,
        useBom: false,
        useKeysAsHeaders: true,
      };
      const csvExporter = new ExportToCsv(options);
      let items = [];
      let header = {};

      header['MID'] = 'MID';
      header['Name'] = 'Name';
      this.arrangedColumnHeaders.forEach((element) => {
        element.forEach((e) => {
          header[e] = e;
        });
        // header[`"${element}"`] = `"${element}"`;
      });
      this.arrangedExportData.forEach((data) => {
        this.arrangedColumnHeaders.forEach((column) => {
          column.forEach((singleColumn) => {
            let exist = this.keyExists(singleColumn, data); //data.hasOwnProperty(column);
            if (!exist) {
              data[singleColumn] = '';
            }
          });
        });
      });
      // this.tableSettings.forEach(element => {
      //   header[element.Header] = element.Type + '-' + element.Header
      // });
      this.arrangedExportData.forEach((element) => {
        //console.log(element);
        var item = {};
        for (var key in element) {
          if (key != '$$index' && key != 'undefined') {
            item[header[key]] = element[key];
          }
        }
        items.push(item);
        item = {};
      });

      // this.exportData.forEach(element => {
      //   let item = {};
      //   for (var key in element) {
      //     if (key != '$$index' && key != 'undefined') {
      //       item[header[key]] = element[key]
      //     }
      //   }
      //   items.push(item);
      //   item = {};
      // });
      //console.log(items);
      csvExporter.generateCsv(items);
    }
  }

  keyExists(key, search) {
    if (
      !search ||
      (search.constructor !== Array && search.constructor !== Object)
    ) {
      return false;
    }
    for (var i = 0; i < search.length; i++) {
      if (search[i] === key) {
        return true;
      }
    }
    return key in search;
  }
  // ngOnDestroy() {
  //   this.subscription.unsubscribe();
  //   this.changeDetect.detectChanges();
  // }
}
