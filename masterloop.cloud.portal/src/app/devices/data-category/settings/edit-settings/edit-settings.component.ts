import { Component, Inject, NgZone, OnInit } from '@angular/core';
import { SettingService, LoggerService } from '../../../../services';
import { dataTypesConstant } from '../../../../core/constants';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TemplateSetting } from 'src/app/core/interfaces/template-setting.interface';
import { EnumerationGroupDetails, EnumerationItem } from 'src/app/core/interfaces/template-enumeration.interface';
import { dataTypes } from 'src/app/core/constants/dataType-names';

interface DialogData {
  setting: any;
  templateInfo: any;
  deviceSettings: any
}

@Component({
  selector: 'app-edit-settings',
  templateUrl: './edit-settings.component.html',
  styleUrls: ['./edit-settings.component.scss'],
})
export class EditSettingsComponent implements OnInit {
  MID: string;
  settingId: string;
  deviceSetting: any = {
    Value: '',
  };
  changedSettings: any = [];
  settings: any = [];
  deviceDefaultSetting: TemplateSetting;
  dataTypes = {};
  deviceStatusColor;
  templateInfo: any = {};
  deviceSettings: any = {};
  modalInformation: any;
  checkboxValue: boolean = false;
  sampleCheck;
  enumGroups: EnumerationGroupDetails[];
  enumItemsOfSelectedEnumGroup: EnumerationItem[] = [];
  showEnumItemsInDefaultValue: boolean = false;

  constructor(
    private settingService: SettingService,
    private loggerService: LoggerService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public dialogRef: MatDialogRef<EditSettingsComponent>,
    private zone: NgZone
  ) {
    setTimeout(() => {
      this.zone.run(
        () => this.setSettingInformation()
      );
    });
  }

  setSettingInformation() {
    this.modalInformation = { ...this.data['setting'] };
    this.templateInfo = { ...this.data['templateInfo'] };
    this.deviceSettings = { ...this.data['deviceSettings'] };
    if (this.templateInfo?.['EnumerationGroups']) {
      this.enumGroups = this.templateInfo['EnumerationGroups'];
    }
    if (this.modalInformation != null) {
      this.sampleCheck = false;
      this.MID = this.modalInformation.MID;
      this.settingId = this.modalInformation.Id;
      this.dataTypes = dataTypesConstant;
      this.deviceSettingDetails();
    }
  }

  deviceSettingDetails() {
    let deviceSettingsList = this.deviceSettings;
    let deviceTemplateInfo = this.templateInfo;

    if (deviceSettingsList.Values.length > 0) {
      this.settings = deviceSettingsList.Values.filter((setting) => setting.IsDefaultValue == false);
      this.deviceSetting = deviceSettingsList.Values.find((setting) => setting.Id == this.settingId);
      if (this.deviceSetting.DataType == 2) {
        if (this.deviceSetting.Value == '0') {
          this.checkboxValue = false;
        } else {
          this.checkboxValue = true;
        }
      }
    }

    if (deviceTemplateInfo.Settings.length > 0) {
      this.deviceDefaultSetting = deviceTemplateInfo.Settings.find((setting) => setting.Id == this.settingId);
    }
    if (this.deviceDefaultSetting?.Quantity === dataTypes.emptyEnumQuntityOption.quantityId) {
      this.enumItemsOfSelectedEnumGroup = this.enumGroups.find(eg => eg.Id === this.deviceDefaultSetting?.Unit)?.Items;
      this.showEnumItemsInDefaultValue = true;
    }
  }

  ngOnInit() { }

  UpdateDeviceSetting() {
    this.changedSettings.splice(0, this.changedSettings.length);
    this.changedSettings = this.settings;
    if (this.deviceSetting.DataType == 2) {
      if (this.checkboxValue == false) {
        this.deviceSetting.Value = 0;
      } else {
        this.deviceSetting.Value = 1;
      }
    }

    this.changedSettings.push({
      Id: this.settingId,
      Value: this.deviceSetting.Value,
    });
    this.settingService
      .setDeviceSettings(this.MID, this.changedSettings)
      .subscribe(
        (data) => {
          this.loggerService.showSuccessfulMessage(
            'Updating device settings success!'
          );
          this.dialogRef.close(true);
        },
        (error) => {
          this.loggerService.showErrorMessage(
            'Editing device settings failed!'
          );
          this.dialogRef.close(false);
        }
      );
  }

  getValueForDisplay() {
    if (this.deviceDefaultSetting?.DataType == 4 && this.deviceDefaultSetting?.Quantity === dataTypes.emptyEnumQuntityOption.quantityId) {
      let enumName = this.enumItemsOfSelectedEnumGroup.find(ei => ei.Id === +this.deviceDefaultSetting?.DefaultValue)?.Name;
      if (enumName) {
        return `${this.deviceDefaultSetting?.DefaultValue} = ${enumName}`;
      }
    }
    else {
      return this.deviceDefaultSetting?.DefaultValue;
    }
  }

  convertValueToString(value: number): string {
    return `${value}`;
  }
}
