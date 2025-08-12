import { Component, OnInit, ViewContainerRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService, TemplateService, DialogsService } from '../services';
import { GuidGenerator } from '../../app/core/helpers/guid-generator.helper';
import { TemplateObservationsComponent } from './template-observations/template-observations.component';
import { TemplateSettingsComponent } from './template-settings/template-settings.component';
import { TemplateCommandsComponent } from './template-commands/template-commands.component';
import { TemplatePulsesComponent } from './template-pulses/template-pulses.component';
import { TenantService } from '../services/tenant.service';
import { LocalStorageKeys } from '../core/constants';
import { Protocols } from '../core/constants/protocol-constant';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { TemplateImportComponent } from './template-import/template-import.component';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { TemplateEnumerationComponent } from './template-enumeration/template-enumeration.component';
import * as moment from 'moment';
import { QuantityItem } from '../core/interfaces/quantity-unit.interface';
import { LocalStorageService } from '../services/local-storage.service';

@Component({
  selector: 'app-templates',
  templateUrl: './templates.component.html',
  styleUrls: ['./templates.component.scss'],
})
export class TemplatesComponent implements OnInit {
  @ViewChild('templateObservations') observationsChild: TemplateObservationsComponent;
  @ViewChild('templateSettings') settingsChild: TemplateSettingsComponent;
  @ViewChild('templateCommands') commandChild: TemplateCommandsComponent;
  @ViewChild('templatePulses') pulsesChild: TemplatePulsesComponent;
  @ViewChild('templateEnumeration')
  enumerationChild: TemplateEnumerationComponent;

  MID: string;
  templateName;
  templateDescription: any;
  templateId: any;
  templateRevision: any;
  templateDetails = {};
  settingDetails = [];
  observationDetails = [];
  pulseDetails = [];
  commandsDetails = [];
  enumerationDetails = [];
  isEditable = false;
  isNewTemplate: boolean = false;
  newSettingDetails = [];
  newObservationDetails = [];
  newPulseDetails = [];
  newCommandDetails = [];
  newCommandArgumentDetails = [];
  newEnumerationDetails = [];
  newEnumerationItemsDetails = [];

  updatedSettingDetails = [];
  updatedObservationDetails = [];
  updatedPulseDetails = [];
  updatedCommandDetails = [];
  updatedEnumerationDetails = [];
  tenantId;
  tenants;
  protocols;
  defaultProtocol;

  urlSearch = [];
  isView = false;
  downloadJsonHref: any;

  public form: FormGroup;
  templateUnits: QuantityItem[];

  /** Template Import Section
   *
   */
  dialogRef: MatDialogRef<TemplateImportComponent>;
  config: MatDialogConfig = {
    backdropClass: 'custom-dialog-backdrop-class',
    panelClass: 'custom-dialog-panel-class',
    disableClose: false,
    width: '700px',
    height: 'min-content',
    position: {
      top: '',
      bottom: '',
      left: '',
      right: '',
    },
  };

  constructor(
    private templateService: TemplateService,
    route: ActivatedRoute,
    private router: Router,
    private loggerService: LoggerService,
    public dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private tenantService: TenantService,
    public dialog: MatDialog,
    private localStorageService: LocalStorageService
  ) {
    this.urlSearch = this.router.url.split('/');
    if (this.urlSearch[3] != 'view') {
      this.isView = true;
      this.isEditable = true;
    }

    if (route.snapshot.params['id'] != 'new') {
      this.MID = route.snapshot.params['id'];
      this.isNewTemplate = false;
    } else {
      this.isNewTemplate = true;
      this.isEditable = true;
    }

    // Get tenant details
    this.tenantService.getTenants().subscribe((data) => {
      data.sort(function (a, b) {
        var textA = a.Name.toUpperCase();
        var textB = b.Name.toUpperCase();
        return textA < textB ? -1 : textA > textB ? 1 : 0;
      });
      this.tenants = data;
    });
    this.protocols = Protocols.protocolTypes;
    this.defaultProtocol = '2'; //Protocols.protocolTypes.filter(x=>x.name == 'AMQP')[0].id;
    this.getTemplateUnits();
  }

  getTemplateUnits() {
    this.templateService.getUnits().subscribe((data) => {
      this.templateUnits = data['Quantities'] as QuantityItem[];
      this.localStorageService.setQuantities(this.templateUnits);
    });
  }

  /**
   * Template Export section
   */
  downloadTemplateJson() {
    this.templateService.getTemplateDetails(this.MID).subscribe((data) => {
      this.downloadFile(data);
    });
  }

  downloadFile(data) {
    var nameOfFileToDownload: string;
    nameOfFileToDownload = `${this.MID}.json`;

    let dataToWrite = JSON.stringify(data, null, 4);
    var blob = new Blob([dataToWrite], {
      type: 'data:text/plain;charset=utf-8',
    });

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, nameOfFileToDownload);
    } else {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nameOfFileToDownload;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  /**
   * Template import section
   */
  openTemplateImportView() {
    const dialogRef = this.dialog.open(TemplateImportComponent, {
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: 'custom-dialog-panel-class',
      disableClose: false,
      width: '80%',
      maxHeight: '80%',
      position: {
        top: '',
        bottom: '',
        left: '',
        right: '',
      },
      data: { selectedTID: this.MID },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result == 'imported') {
        this.ngOnInit();
      }
    });
  }

  ngOnInit() {
    this.buildForm();
    if (!this.isNewTemplate) {
      this.templateService.getTemplateDetails(this.MID).subscribe(
        (data) => {
          this.templateDetails = data;
          this.templateId = this.templateDetails['Id'];
          this.templateName = this.templateDetails['Name'];
          this.templateDescription = this.templateDetails['Description'];
          this.templateRevision = this.templateDetails['Revision'];
          if (this.templateDetails['Protocol'] == null) {
            this.defaultProtocol = '0';
          } else {
            this.defaultProtocol = this.templateDetails['Protocol'].toString();
          }

          this.settingDetails = this.templateDetails['Settings'].sort(function (
            a,
            b
          ) {
            return parseFloat(a.Id) - parseFloat(b.Id);
          });
          this.observationDetails = this.templateDetails['Observations'].sort(
            function (a, b) {
              return parseFloat(a.Id) - parseFloat(b.Id);
            }
          );
          this.observationDetails = this.templateDetails['Observations'].sort(
            function (a, b) {
              return parseFloat(a.Id) - parseFloat(b.Id);
            }
          );
          this.pulseDetails = this.templateDetails['Pulses'].sort(function (
            a,
            b
          ) {
            return parseFloat(a.Id) - parseFloat(b.Id);
          });
          this.commandsDetails = this.templateDetails['Commands'].sort(
            function (a, b) {
              return parseFloat(a.Id) - parseFloat(b.Id);
            }
          );
          if (this.templateDetails['EnumerationGroups']) {
            this.enumerationDetails = this.templateDetails[
              'EnumerationGroups'
            ]?.sort(function (a, b) {
              return parseFloat(a.Id) - parseFloat(b.Id);
            });
          }

          this.assignGuidsForTemplateItems();
          this.setForm();
        },
        (error) => {
          this.loggerService.showErrorMessage(
            'Getting template details failed!'
          );
        }
      );
    }
  }

  private buildForm() {
    this.form = new FormGroup({
      TemplateId: new FormControl(null, [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(16),
      ]),
      TemplateName: new FormControl(null, [Validators.required]),
      TemplateDescription: new FormControl(null, [Validators.required]),
      TemplateRevision: new FormControl(null, [Validators.required]),
      DefaultProtocol: new FormControl(null, [Validators.required]),
      TenantId: new FormControl(null, [Validators.required]),
    });
  }

  private setForm() {
    this.form = new FormGroup({
      TemplateId: new FormControl(this.templateId, [Validators.required]),
      TemplateName: new FormControl(this.templateName, [Validators.required]),
      TemplateDescription: new FormControl(this.templateDescription, [
        Validators.required,
      ]),
      TemplateRevision: new FormControl(this.templateRevision, [
        Validators.required,
      ]),
      DefaultProtocol: new FormControl(this.defaultProtocol, [
        Validators.required,
      ]),
      TenantId: new FormControl(null, [Validators.required]),
    });
  }

  scrollTop() {
    let element = document.querySelector('#templatesView');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }
  assignGuidsForTemplateItems() {
    this.assignGuidForObservations();
    this.assignGuidForSettings();
    this.assignGuidForPulses();
    this.assignGuidForCommandsAndArguments();
    this.assignGuidForEnumGroups();
  }

  assignGuidForObservations() {
    this.observationDetails.forEach((observation) => {
      var guid = GuidGenerator.uuidv4();
      observation.UniqueId = guid;
    });
  }

  assignGuidForSettings() {
    this.settingDetails.forEach((setting) => {
      var guid = GuidGenerator.uuidv4();
      setting.UniqueId = guid;
    });
  }

  assignGuidForPulses() {
    this.pulseDetails.forEach((pulse) => {
      var guid = GuidGenerator.uuidv4();
      pulse.UniqueId = guid;
    });
  }

  assignGuidForEnumGroups() {
    this.enumerationDetails.forEach((enumGroup) => {
      var guid = GuidGenerator.uuidv4();
      enumGroup.UniqueId = guid;
    });
  }

  assignGuidForCommandsAndArguments() {
    this.commandsDetails.forEach((command) => {
      var guid = GuidGenerator.uuidv4();
      command.UniqueId = guid;
      this.assignGuidForCommandArguments(command.Arguments);
    });
  }

  assignGuidForCommandArguments(commandArguments: any[]) {
    if (commandArguments && commandArguments.length > 0) {
      commandArguments.forEach((argument) => {
        var guid = GuidGenerator.uuidv4();
        argument.UniqueId = guid;
      });
    }
  }

  fetch(cb) {
    const req = new XMLHttpRequest();
    req.open('GET', `assets/data/mocks/tenants.json`);
    req.onload = () => {
      cb(JSON.parse(req.response));
    };
    req.send();
  }

  editGeneralTemplate() {
    this.isEditable = true;
  }

  handleSettingsUpdated(settings) {
    if (this.settingDetails.length > 0) {
      //For update
      this.settingDetails.forEach((settingElement) => {
        if (settingElement['UniqueId'] == settings['UniqueId']) {
          //Replace updated object
          this.settingDetails[this.settingDetails.indexOf(settingElement)] =
            settings;
          this.isEditable = true;
        }
      });
      this.updatedSettingDetails = this.settingDetails;
    } else {
      // For creation
      if (this.newSettingDetails.length == 0) {
        this.newSettingDetails.push(settings);
      } else {
        var elementIn = false;
        this.newSettingDetails.forEach((settingElement) => {
          if (settingElement['UniqueId'] == settings['UniqueId']) {
            if (settings['IsDelete']) {
              this.newSettingDetails.splice(settings.$$index, 1);
            } else {
              //Replace updated object
              this.newSettingDetails[
                this.newSettingDetails.indexOf(settingElement)
              ] = settings;
            }
            elementIn = true;
          }
        });
        if (!elementIn) {
          this.newSettingDetails.push(settings);
        }
      }
    }
  }

  handleObservationUpdated(observations) {
    if (this.observationDetails.length > 0) {
      this.observationDetails.forEach((observationElement) => {
        if (observationElement['UniqueId'] == observations['UniqueId']) {
          //Replace updated object
          this.observationDetails[
            this.observationDetails.indexOf(observationElement)
          ] = observations;
          this.isEditable = true;
        }
      });
      this.updatedObservationDetails = this.observationDetails;
    } else {
      if (this.newObservationDetails.length == 0) {
        this.newObservationDetails.push(observations);
        this.newObservationDetails = [...this.newObservationDetails];
      } else {
        var elementIn = false;
        this.newObservationDetails.forEach((settingElement) => {
          if (settingElement['UniqueId'] == observations['UniqueId']) {
            if (observations['IsDelete']) {
              this.newObservationDetails.splice(observations.$$index, 1);
            } else {
              //Replace updated object
              this.newObservationDetails[
                this.newObservationDetails.indexOf(settingElement)
              ] = observations;
            }
            elementIn = true;
          }
        });
        if (!elementIn) {
          this.newObservationDetails.push(observations);
          this.newObservationDetails = [...this.newObservationDetails];
        }
      }
    }
  }

  handlePulseUpdated(pulses) {
    if (this.pulseDetails.length > 0) {
      this.pulseDetails.forEach((pulseElement) => {
        if (pulseElement['UniqueId'] == pulses['UniqueId']) {
          //Replace updated object
          this.pulseDetails[this.pulseDetails.indexOf(pulseElement)] = pulses;
          this.isEditable = true;
        }
      });
      this.updatedPulseDetails = this.pulseDetails;
    } else {
      if (this.newPulseDetails.length == 0) {
        this.newPulseDetails.push(pulses);
      } else {
        var elementIn = false;
        this.newPulseDetails.forEach((settingElement) => {
          if (settingElement['UniqueId'] == pulses['UniqueId']) {
            if (pulses['IsDelete']) {
              this.newPulseDetails.splice(pulses.$$index, 1);
            } else {
              //Replace updated object
              this.newPulseDetails[
                this.newPulseDetails.indexOf(settingElement)
              ] = pulses;
            }
            elementIn = true;
          }
        });
        if (!elementIn) {
          this.newPulseDetails.push(pulses);
        }
      }
    }
  }

  handleCommandsUpdated(commands) {
    if (this.commandsDetails.length > 0) {
      //Use when editing template

      if (commands['DataType'] == '' || commands['DataType']) {
        //For Arguments
        //Get the arguments to for new one edited once
      } else {
        //For Commands
        this.commandsDetails.forEach((commandElement) => {
          if (commandElement['UniqueId'] == commands['UniqueId']) {
            this.commandsDetails[this.commandsDetails.indexOf(commandElement)] =
              commands;
            this.isEditable = true;
          }
        });
      }
      this.updatedCommandDetails = this.commandsDetails;
    } else {
      //Use when adding new template
      if (commands['DataType'] == '' || commands['DataType']) {
        //For Arguments
        if (this.newCommandArgumentDetails.length == 0) {
          this.newCommandArgumentDetails.push(commands);
        } else {
          var elementIn = false;
          this.newCommandArgumentDetails.forEach((commandArgElement) => {
            if (commandArgElement['UniqueId'] == commands['UniqueId']) {
              //Replace updated object
              this.newCommandArgumentDetails[
                this.newCommandArgumentDetails.indexOf(commandArgElement)
              ] = commands;
              elementIn = true;
            }
          });
          if (!elementIn) {
            this.newCommandArgumentDetails.push(commands);
          }
        }
      } else {
        //For Commands
        if (this.newCommandDetails.length == 0) {
          this.newCommandDetails.push(commands);
        } else {
          var elementIn = false;
          this.newCommandDetails.forEach((commandElement) => {
            if (commandElement['UniqueId'] == commands['UniqueId']) {
              if (commands['IsDelete']) {
                this.newCommandArgumentDetails.splice(commands.$$index, 1);
              } else {
                //Replace updated object
                this.newCommandDetails[
                  this.newCommandDetails.indexOf(commandElement)
                ] = commands;
              }
              elementIn = true;
            }
          });
          if (!elementIn) {
            this.newCommandDetails.push(commands);
          }
        }
      }
    }
  }

  handleEnumerationUpdated(enumeration) {
    if (this.enumerationDetails.length > 0) {
      //Use when editing template
      this.enumerationDetails.forEach((enumGroup) => {
        if (enumGroup['UniqueId'] == enumeration['UniqueId']) {
          this.enumerationDetails[this.enumerationDetails.indexOf(enumGroup)] =
            enumeration;
          this.isEditable = true;
        }
      });
      this.updatedEnumerationDetails = this.enumerationDetails;
    } else {
      //Use when adding new template
      if (this.newEnumerationDetails.length == 0) {
        this.newEnumerationDetails.push(enumeration);
      } else {
        var elementIn = false;
        this.newEnumerationDetails.forEach((enumGroup) => {
          if (enumGroup['UniqueId'] == enumeration['UniqueId']) {
            if (enumeration['IsDelete']) {
              this.newEnumerationDetails.splice(enumeration.$$index, 1);
            } else {
              //Replace updated object
              this.newEnumerationDetails[
                this.newEnumerationDetails.indexOf(enumGroup)
              ] = enumeration;
            }
            elementIn = true;
          }
        });
        if (!elementIn) {
          this.newEnumerationDetails.push(enumeration);
        }
      }
    }
  }

  submitChanges() {
    let utcNow = moment.utc();
    let lastUpdatedTime = utcNow.format('YYYY-MM-DDTHH:mm:ss');

    if (
      this.templateName != this.templateDetails['Name'] ||
      this.templateDescription != this.templateDetails['Description'] ||
      Object.keys(this.settingDetails).length != 0 ||
      Object.keys(this.observationDetails).length != 0 ||
      Object.keys(this.pulseDetails).length != 0 ||
      Object.keys(this.enumerationDetails).length != 0
    ) {
      if (this.updatedSettingDetails.length == 0) {
        this.updatedSettingDetails = this.settingDetails;
      }
      if (this.updatedObservationDetails.length == 0) {
        this.updatedObservationDetails = this.observationDetails;
      }
      if (this.updatedCommandDetails.length == 0) {
        this.updatedCommandDetails = this.commandsDetails;
      }
      if (this.updatedPulseDetails.length == 0) {
        this.updatedPulseDetails = this.pulseDetails;
      }
      if (this.updatedEnumerationDetails.length == 0) {
        this.updatedEnumerationDetails = this.enumerationDetails;
      }

      var settingDetails = [];
      var obsDetails = [];
      var cmdDetails = [];
      var pulseDetails = [];
      var enumGroupDetails = [];

      this.updatedSettingDetails.forEach((element) => {
        element['DataType'] = parseInt(element['DataType']);
        element['Id'] = parseInt(element['Id']);
        if (element['Description'] == '') {
          element['Description'] = null;
        }
        element['IsRequired'] = false;
        element['LastUpdatedOn'] = lastUpdatedTime;
        delete element.$$index;
        settingDetails.push(element);
      });
      this.updatedObservationDetails.forEach((element) => {
        if (element['Historian'] == '') {
          element['Historian'] = 0;
        } else {
          element['Historian'] = parseInt(element['Historian']);
        }

        delete element.$$index;
        obsDetails.push(element);
      });
      this.updatedCommandDetails.forEach((element) => {
        delete element.$$index;

        if (
          typeof element['Arguments'] != 'undefined' &&
          element['Arguments'] != null
        ) {
          var argument = [];
          element['Arguments'].forEach((argEle) => {
            delete argEle.$$index;
            argument.push(argEle);
          });
          element['Arguments'] = argument;
        }
        cmdDetails.push(element);
      });
      this.updatedPulseDetails.forEach((element) => {
        delete element.$$index;
        pulseDetails.push(element);
      });

      this.updatedEnumerationDetails.forEach((element) => {
        delete element.$$index;
        enumGroupDetails.push(element);
      });

      if (pulseDetails.length == 0) {
        pulseDetails.push({
          Description: 'Device pulse',
          Id: 0,
          MaximumAbsence: 3700,
          Name: 'Device pulse',
          UniqueId: GuidGenerator.uuidv4(),
        });
      }

      var submissionObj = {
        Id: this.templateId,
        Name: this.templateName,
        Description: this.templateDescription,
        Revision: this.templateRevision,
        Observations: obsDetails,
        Commands: cmdDetails,
        Settings: settingDetails,
        Pulses: pulseDetails,
        EnumerationGroups: enumGroupDetails,
      };

      this.templateService
        .updateTemplate(this.templateId, submissionObj)
        .subscribe(
          (response) => {
            //Reset objects for navigation
            this.templateDetails['Name'] = this.templateName;
            this.templateDetails['Revision'] = this.templateRevision;
            this.templateDetails['Description'] = this.templateDescription;
            this.updatedSettingDetails = [];
            this.updatedObservationDetails = [];
            this.updatedPulseDetails = [];
            this.updatedCommandDetails = [];
            this.updatedEnumerationDetails = [];
            this.loggerService.showSuccessfulMessage(
              'Template successfully updated!'
            );

            this.updateSessionAndLocalStorage();

            this.ngOnInit();
            this.observationsChild.loadData();
            this.observationsChild.unsetEditing();
            this.settingsChild.loadData();
            this.settingsChild.unsetEdting();
            this.commandChild.loadData();
            this.commandChild.unsetEdting();
            this.pulsesChild.loadData();
            this.pulsesChild.unsetEdting();
            this.enumerationChild.loadData();
            this.enumerationChild.unsetEdting();
            this.scrollTop();
          },
          (error) => {
            this.loggerService.showErrorMessage('Template updating failed!');
          }
        );
    }
  }

  createTemplate() {
    if (
      typeof this.templateId == 'undefined' ||
      typeof this.templateName == 'undefined' ||
      typeof this.tenantId == 'undefined' ||
      typeof this.templateDescription == 'undefined'
    ) {
      //this.templateId.
      this.form.markAllAsTouched();
      this.loggerService.showErrorMessage('Required fields are missing !');
    } else {
      var settingDetails = [];
      var obsDetails = [];
      var cmdDetails = [];
      var pulseDetails = [];
      var enumGroupDetails = [];

      this.newSettingDetails.forEach((element) => {
        element['DataType'] = parseInt(element['DataType']);
        element['Id'] = parseInt(element['Id']);
        if (element['Description'] == '') {
          element['Description'] = null;
        }
        element['IsRequired'] = false;
        element['Quantity'] = 0;
        element['Unit'] = 0;
        element['LastUpdatedOn'] = '0001-01-01T00:00:00';
        delete element.$$index;
        settingDetails.push(element);
      });
      this.newObservationDetails.forEach((element) => {
        element['Historian'] = parseInt(element['Historian']);
        delete element.$$index;
        obsDetails.push(element);
      });
      this.newCommandDetails.forEach((element) => {
        delete element.$$index;

        if (
          typeof element['Arguments'] != 'undefined' &&
          element['Arguments'] != null
        ) {
          var argument = [];
          element['Arguments'].forEach((argEle) => {
            delete argEle.$$index;
            argument.push(argEle);
          });
          element['Arguments'] = argument;
        }
        cmdDetails.push(element);
      });
      this.newPulseDetails.forEach((element) => {
        delete element.$$index;
        pulseDetails.push(element);
      });
      this.newEnumerationDetails.forEach((element) => {
        delete element.$$index;
        enumGroupDetails.push(element);
      });

      if (pulseDetails.length == 0) {
        pulseDetails.push({
          Description: 'Device pulse',
          Id: 0,
          MaximumAbsence: 3700,
          Name: 'Device pulse',
          UniqueId: GuidGenerator.uuidv4(),
        });
      }

      var submissionObj = {
        Id: this.templateId,
        Name: this.templateName,
        Description: this.templateDescription,
        Revision: this.templateRevision,
        Protocol: this.defaultProtocol,
        Observations: obsDetails,
        Commands: cmdDetails,
        Settings: settingDetails,
        Pulses: pulseDetails,
        EnumerationGroups: enumGroupDetails,
      };

      this.templateService
        .createTemplate(this.tenantId, submissionObj)
        .subscribe(
          (response) => {
            //Reset objects for navigation
            this.templateDetails['Id'] = this.templateId;
            this.templateDetails['Name'] = this.templateName;
            this.templateDetails['Revision'] = this.templateRevision;
            this.templateDetails['Description'] = this.templateDescription;
            this.templateDetails['Protocol'] = this.defaultProtocol;
            this.templateDetails['Pulses'] = pulseDetails;
            this.newSettingDetails = [];
            this.newObservationDetails = [];
            this.newPulseDetails = [];
            this.newCommandDetails = [];
            this.newEnumerationDetails = [];

            this.loggerService.showSuccessfulMessage(
              'Template successfully added!'
            );

            this.updateSessionAndLocalStorage();
            this.ngOnInit();
            this.observationsChild.loadData();
            this.observationsChild.unsetEditing();
            this.settingsChild.loadData();
            this.settingsChild.unsetEdting();
            this.commandChild.loadData();
            this.commandChild.unsetEdting();
            this.pulsesChild.loadData();
            this.pulsesChild.unsetEdting();
            this.enumerationChild.loadData();
            this.enumerationChild.unsetEdting();
            this.scrollTop();
            this.router.navigateByUrl(
              'templates/details/view/' + this.templateId
            );
          },
          (error) => {
            if (error.status == 401) {
              this.loggerService.showErrorMessage(error.statusText);
            } else {
              this.loggerService.showErrorMessage('Template creation failed!');
            }
          }
        );
    }
  }

  canDeactivate(): Promise<boolean> | boolean {
    if (this.isNewTemplate) {
      //For new template
      if (
        this.templateId != this.templateDetails['Id'] ||
        this.templateRevision != this.templateDetails['Revision'] ||
        this.templateName != this.templateDetails['Name'] ||
        this.templateDescription != this.templateDetails['Description'] ||
        Object.keys(this.newSettingDetails).length != 0 ||
        Object.keys(this.newObservationDetails).length != 0 ||
        Object.keys(this.newPulseDetails).length != 0 ||
        Object.keys(this.newCommandDetails).length != 0 ||
        Object.keys(this.newEnumerationDetails).length != 0
      ) {
        return this.dialogService
          .confirm(
            'Confirmation Dialog',
            'Are you sure you want to discard the changes?',
            true,
            this.viewContainerRef
          )
          .toPromise();
      }
    } else {
      // For template editing
      // Allow synchronous navigation (`true`) if no crisis or the crisis is unchanged
      if (
        this.templateName != this.templateDetails['Name'] ||
        this.templateRevision != this.templateDetails['Revision'] ||
        this.templateDescription != this.templateDetails['Description'] ||
        Object.keys(this.updatedSettingDetails).length != 0 ||
        Object.keys(this.updatedObservationDetails).length != 0 ||
        Object.keys(this.updatedPulseDetails).length != 0 ||
        Object.keys(this.updatedCommandDetails).length != 0 ||
        Object.keys(this.updatedEnumerationDetails).length != 0
      ) {
        //return this.dialogService.confirmation('Discard changes?');
        return this.dialogService
          .confirm(
            'Confirmation Dialog',
            'Are you sure you want to discard the changes?',
            true,
            this.viewContainerRef
          )
          .toPromise();
      }
    }

    // Otherwise ask the user with the dialog service and return its
    // promise which resolves to true or false when the user decides
    return true;
  }

  updateSessionAndLocalStorage(): void {
    this.updateLocalStorage();
    this.updateSessionStorage();
  }

  updateLocalStorage(): void {
    this.templateService.getTemplates().subscribe((data) => {
      localStorage.setItem(
        LocalStorageKeys.CACHED_TEMPLATES,
        JSON.stringify(data)
      );
    });
  }

  updateSessionStorage(): void {
    sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
  }

  onNewObservationClicked() {
    this.observationsChild.openAddObservationView();
  }

  onNewSettingClicked() {
    this.settingsChild.openAddSettingView();
  }

  onNewCommandClicked() {
    this.commandChild.openAddCommandView();
  }

  onNewEnumerationGroupClicked() {
    this.enumerationChild.openAddEnumerationView();
  }

  onNewPulseClicked() {
    this.pulsesChild.openAddPulseView();
  }
}
