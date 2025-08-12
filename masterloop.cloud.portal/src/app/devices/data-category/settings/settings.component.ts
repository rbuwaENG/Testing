import { Component, OnInit, ViewContainerRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  SettingService,
  LoggerService,
  DeviceService,
  DialogsService,
  IndexedDbService,
  TemplateService,
} from '../../../services';
import { ActivatedRoute } from '@angular/router';
import { dataTypesConstant } from '../../../core/constants';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';
import { EditSettingsComponent } from './edit-settings/edit-settings.component';
import { EnumerationGroupDetails } from 'src/app/core/interfaces/template-enumeration.interface';
import { TemplateSetting } from 'src/app/core/interfaces/template-setting.interface';
import { dataTypes } from 'src/app/core/constants/dataType-names';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  @ViewChild('deviceSettingsListTable') table: any;

  MID: string;
  rows = [];
  columns = [];
  lastUpdate: any;
  settings: any = [];
  changedSettings: any = [];
  dataTypes = {};
  isMobile: boolean = false;
  expanded: any = {};
  templateDetails: any = {};
  deviceSettings: any = {};
  templateSettings: any = {};
  enumGroups: EnumerationGroupDetails[];
  quantities: QuantityItem[];

  deviceStatusColor;

  constructor(
    private route: ActivatedRoute,
    private settingService: SettingService,
    private loggerService: LoggerService,
    private deviceService: DeviceService,
    private dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    protected indexedDbService: IndexedDbService,
    public dialog: MatDialog,
    private cache: LocalStorageService,
    private templateService: TemplateService
  ) {
    this.MID = route.snapshot.params['id'];
    this.dataTypes = dataTypesConstant;
    /**Mobile UI trigger */
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth < 768
    ) {
      this.isMobile = true;
    }
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

  toggleExpandRow(row) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  onDetailToggle(event) {}
  onResize() {
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth < 768
    ) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  ngOnInit() {
    this.getTemplateDetails();
    this.getDeviceSettings();
    this.setDeviceStatusColor();
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.MID).subscribe((data) => {
      if (data != null) {
        pulseTime = data.To;
      }
      this.handleDeviceColorCode(pulseTime);
    });
  }

  handleDeviceColorCode(pulseTime) {
    this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
      pulseTime,
      'UTC'
    );
  }

  resetToDefaultSettings(setting) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to reset to default values?',
        true,
        this.viewContainerRef
      )
      .subscribe((res) => {
        if (res == true) {
          this.changedSettings.splice(0, this.changedSettings.length);
          this.settingService
            .setDeviceSettings(
              this.MID,
              this.settings.filter(
                (i) => i.Id != setting.Id && !i.IsDefaultValue
              )
            )
            .subscribe(
              (data) => {
                this.loggerService.showSuccessfulMessage(
                  'Setting device default settings success!'
                );
                this.getDeviceSettings();
              },
              (error) => {
                this.loggerService.showErrorMessage(
                  'Setting device default settings failed!'
                );
              }
            );
        }
      });
  }

  getDeviceSettings() {
    this.settingService.getDeviceSettings(this.MID).subscribe(
      (data) => {
        if (data) {
          this.deviceSettings = { ...data };
          this.setAbbreviationOnDeviceSettings();
        }
        data.Values.forEach((item) => {
          if (item.IsDefaultValue && item.Value) {
            item['ValueTag'] = 'Default';
            item['ValueTagLabel'] = 'menu-badge mat-blue';
          }
          if (!item.Value) {
            item['ValueTag'] = 'Undefined';
            item['ValueTagLabel'] = 'menu-badge mat-orange';
          }
        });
        this.settings = data.Values.sort(function (a, b) {
          return parseFloat(a.Id) - parseFloat(b.Id);
        });
        this.lastUpdate = data.LastUpdatedOn;
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting device settings failed!');
      }
    );
  }

  getTemplateDetails() {
    this.deviceService.getDeviceTemplate(this.MID).subscribe((data) => {
      this.templateDetails = data;
      if (this.templateDetails?.['Settings']) {
        this.templateSettings = this.templateDetails['Settings'];
        this.setAbbreviation();
      }
      if (this.templateDetails?.['EnumerationGroups']) {
        this.enumGroups = this.templateDetails['EnumerationGroups'];
      }
    });
  }

  setAbbreviation() {
    let unit = null;
    this.templateSettings.forEach((element) => {
      let quantity = this.quantities.find((x) => x.Id === element.Quantity);
      if (quantity.Units) {
        unit = quantity.Units.find((x) => x.Id === element.Unit);
        element.UnitAbbreviation = unit.Abbreviation;
      } else {
        element.UnitAbbreviation = null;
      }
    });
  }

  setAbbreviationOnDeviceSettings() {
    this.deviceSettings.Values.forEach((element) => {
      let setting = this.templateSettings.find((x) => x.Id === element.Id);
      element.UnitAbbreviation = setting.UnitAbbreviation;
    });
  }

  openSettings(setting: any) {
    setting['MID'] = this.MID;
    const dialogRef = this.dialog.open(EditSettingsComponent, {
      width: '500px',
      minHeight: '400px',
      panelClass: 'settings-modal',
      data: {
        setting: setting,
        templateInfo: this.templateDetails,
        deviceSettings: this.deviceSettings,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ngOnInit();
      }
    });
  }

  getSettingDisplayValue(setting: any) {
    let selectedSetting: TemplateSetting = this.templateDetails.Settings.find(
      (s) => s.Id == setting.Id
    );
    if (
      setting?.DataType == 4 &&
      selectedSetting?.Quantity === dataTypes.emptyEnumQuntityOption.quantityId
    ) {
      let enumItemsOfSelectedEnumGroup = this.enumGroups.find(
        (eg) => eg.Id === selectedSetting?.Unit
      )?.Items;
      let enumName = enumItemsOfSelectedEnumGroup.find(
        (ei) => ei.Id == setting?.Value
      )?.Name;
      if (enumName) {
        return `${setting?.Value} = ${enumName}`;
      }
    } else if (setting?.DataType == 2) {
      return setting?.Value == 1 ? 'True' : 'False';
    } else {
      return setting?.Value;
    }
  }
}
