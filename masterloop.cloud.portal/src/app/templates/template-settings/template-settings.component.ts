import {
  Component,
  Input,
  ViewContainerRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { DataConvertion } from '../../common/dataconvertion';
import { dataTypesConstant, LocalStorageKeys } from '../../core/constants';
import { LoggerService, DialogsService } from '../../services';
import { Router } from '@angular/router';
import { GuidGenerator } from '../../core/helpers/guid-generator.helper';
import { MatDialog } from '@angular/material/dialog';
import { SettingAddEditComponent } from './setting-add-edit/setting-add-edit.component';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';
import { EnumerationGroupDetails } from 'src/app/core/interfaces/template-enumeration.interface';
import { dataTypes } from 'src/app/core/constants/dataType-names';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-template-settings',
  templateUrl: './template-settings.component.html',
  styleUrls: ['./template-settings.component.scss'],
})
export class TemplateSettingsComponent {
  @Input() data: string;
  @Output() settingsUpdated = new EventEmitter();
  @Input() units: QuantityItem[];

  editing = {};
  dataTypes = {};
  settings = [];
  serviceData = [];
  changedSettings = [];
  dataConversion = new DataConvertion();
  urlSearch = [];
  isView = false;
  isNew = false;
  allSettings = [];
  enumGroups: EnumerationGroupDetails[] = [];

  constructor(
    private viewContainerRef: ViewContainerRef,
    private dialogService: DialogsService,
    private router: Router,
    private loggerService: LoggerService,
    public dialog: MatDialog,
    private localStorageService: LocalStorageService
  ) {
    this.dataTypes = dataTypesConstant;

    this.urlSearch = this.router.url.split('/');
    if (this.urlSearch[3] != 'view') {
      this.isView = true;
    }
    if (this.urlSearch[3] == 'edit' && this.urlSearch[4] == 'new') {
      this.isNew = true;
    }
  }

  loadData() {
    if (this.data['Settings']) {
      this.serviceData = this.data['Settings'];
      this.settings = this.serviceData;
      this.setAbbreviation();
      this.allSettings = this.settings;
      this.allSettings = [...this.allSettings];
    }
    if (this.data['EnumerationGroups']) {
      this.enumGroups = this.data['EnumerationGroups'];
    }
  }

  setAbbreviation() {
    let unit = null;
    let quantities = this.localStorageService.getQuantities();

    this.settings.forEach((element) => {
      let quantity = quantities.find((x) => x.Id === element.Quantity);
      if (quantity.Units) {
        unit = quantity.Units.find((x) => x.Id === element.Unit);
      }
      if (element.Quantity === 1000) {
        unit = this.enumGroups.find((x) => x.Id === element.Unit);
      }
      element['UnitName'] = unit?.Name;
      element['UnitAbbreviation'] = unit?.Abbreviation;
    });
  }

  unsetEdting() {
    this.editing = {};
  }

  ngDoCheck() {
    this.loadData();
  }

  validateTheNewId(event, row, rowIndex) {
    this.settings.forEach((setting) => {
      if (setting.$$index != rowIndex) {
        if (setting.Id == event.target.value) {
          this.loggerService.showErrorMessage(
            'The same template setting id is found in another setting.'
          );
          event.target.value = this.settings[rowIndex].Id;
        }
      }
    });
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    if (cell == 'Id') {
      this.validateTheNewId(event, row, rowIndex);
    }

    this.editing[rowIndex + '-' + cell] = false;
    this.settings[rowIndex][cell] = event.target.value;

    //emmit obj to the parent component
    this.settingsUpdated.emit(row);
  }

  deleteSettings(setting, settingRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the setting?',
        true,
        this.viewContainerRef
      )
      .subscribe((res) => {
        if (res == true) {
          this.settings.splice(settingRow, 1);

          setting['IsDelete'] = true;
          this.settingsUpdated.emit(setting);
        }
      });
  }

  openAddSettingView() {
    let settRowId =
      this.settings.length > 0
        ? parseInt(this.settings[this.settings.length - 1]['Id']) + 1
        : 1;
    const dialogRef = this.dialog.open(SettingAddEditComponent, {
      width: '700px',
      disableClose: true,
      data: {
        settRowId: settRowId,
        sett: null,
        units: this.units,
        settings: this.settings,
        enumGroups: this.enumGroups,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result['data'] != null) {
        console.log(result['data']);
        result['data']['IsRequired'] = '';
        result['data']['LastUpdatedOn'] = '';
        result['data']['UniqueId'] = this.assignGuidForSetting();

        this.settings.push(result['data']);
        this.allSettings = this.settings;
        this.allSettings = [...this.allSettings];
        this.settings = [...this.settings];
        this.setAbbreviation();
        this.scrollDown();
      }
    });
  }

  updateSetting(rowIndex, row) {
    const dialogRef = this.dialog.open(SettingAddEditComponent, {
      width: '700px',
      disableClose: true,
      data: {
        settRowId: row.Id,
        sett: row,
        units: this.units,
        settings: this.settings,
        enumGroups: this.enumGroups,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result['data']) {
        result['data']['IsRequired'] = '';
        result['data']['LastUpdatedOn'] = '';
        result['data']['UniqueId'] = row.UniqueId;

        this.settings[rowIndex] = result['data'];
        this.settingsUpdated.emit(result['data']);
      } else {
        this.loggerService.showErrorMessage('Setting edit cancelled!.');
      }
    });
  }

  assignGuidForSetting(): string {
    var guid = GuidGenerator.uuidv4();
    return guid;
  }

  scrollDown() {
    let element = document.querySelector('#settings');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  }

  getDefaultValue(row: any, value: string) {
    if (row['Quantity'] === dataTypes.emptyEnumQuntityOption.quantityId) {
      // enums
      let selectedUnits = row['Unit'];
      let enumItems = this.enumGroups.find(
        (eg) => eg.Id === selectedUnits
      )?.Items;
      if (enumItems) {
        let enumName = enumItems.find((ei) => ei.Id === +value)?.Name;
        if (enumName) {
          return `${value}=${enumName}`;
        }
      }
    }
    return value;
  }
}
