import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewContainerRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { DataConvertion } from '../../common/dataconvertion';
import { dataTypesConstant } from '../../core/constants';
import { DialogsService, LoggerService, TemplateService } from '../../services';
// import { debug } from 'util';
import { GuidGenerator } from '../../core/helpers/guid-generator.helper';

@Component({
  selector: 'app-template-commands',
  templateUrl: './template-commands.component.html',
  styleUrls: ['./template-commands.component.scss'],
})
export class TemplateCommandsComponent {
  @Input() data: string;
  @Output() commandsUpdated = new EventEmitter();
  //@Output() commandsArgumentUpdated = new EventEmitter();

  commandsData;
  editing = {};
  commands = [];
  dataTypes = {};
  changedCommands = [];
  changedArguments = [];
  commandArguments = [];
  dataConversion = new DataConvertion();
  isShow = false;
  subEditing = {};
  //isNew = false;
  selected: any[] = [];
  CmdName;

  urlSearch = [];
  isView = false;
  isNew = false;

  allCommands = [];

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private viewContainerRef: ViewContainerRef,
    private dialogService: DialogsService,
    private loggerService: LoggerService
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
    if (this.data['Commands']) {
      this.commandsData = this.data['Commands'];
      this.commands = this.commandsData;
      this.allCommands = this.commands;
      this.allCommands = [...this.allCommands];
    } else {
      //this.isNew = true;
    }
  }
  unsetEdting() {
    this.editing = {};
  }
  ngDoCheck() {
    this.loadData();
  }

  validateTheNewCommandId(event, row) {
    this.commands.forEach((observation) => {
      if (observation.$$index != row.$$index) {
        if (observation.Id == event.target.value) {
          this.loggerService.showErrorMessage(
            'The same template command id is found in another command.'
          );
          event.target.value = this.commands[row.$$index].Id;
        }
      }
    });
  }

  validateTheNewCommandArgumentId(event, row, rowIndex) {
    this.commandArguments.forEach((argument) => {
      if (argument.$$index != rowIndex) {
        if (argument.Id == event.target.value) {
          this.loggerService.showErrorMessage(
            'The same command argument id is found in another argument.'
          );
          event.target.value = this.commandArguments[rowIndex].Id;
        }
      }
    });
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    if (cell == 'Id') {
      this.validateTheNewCommandId(event, row);
    }

    this.editing[rowIndex + '-' + cell] = false;
    this.commands[rowIndex][cell] = event.target.value;

    //emmit obj to the parent component
    this.commandsUpdated.emit(row);
  }

  editCommandArguments(row) {
    if (typeof row['Arguments'] == 'undefined') {
      this.commandArguments = [];
    } else {
      this.commandArguments = row['Arguments'];
    }
    this.isShow = true;
  }

  updateSubValue(event, cell, cellValue, row, rowIndex) {
    if (cell == 'Id') {
      this.validateTheNewCommandArgumentId(event, row, rowIndex);
    }

    this.subEditing[rowIndex + '-' + cell] = false;
    this.commandArguments[rowIndex][cell] = event.target.value;

    if (this.selected.length > 0) {
      this.selected[0]['Arguments'] = this.commandArguments;
    }

    //emmit obj to the parent component
    this.commandsUpdated.emit(row);
  }

  deleteCommands(command, commandRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the command?',
        true,
        this.viewContainerRef
      )
      .subscribe((res) => {
        if (res == true) {
          this.commands.splice(commandRow, 1);
          command['IsDelete'] = true;
          this.commandsUpdated.emit(command);

          if (this.commandArguments != null) {
            this.commandArguments.length = 0;
          }
        }
      });
  }

  deleteArguments(argument, argumentRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the argument?',
        true,
        this.viewContainerRef
      )
      .subscribe((res) => {
        if (res == true) {
          this.commandArguments.splice(argumentRow, 1);
        }
      });
  }

  addCommands() {
    let deviceObv = {
      Id:
        this.commands.length > 0
          ? parseInt(this.commands[this.commands.length - 1]['Id']) + 1
          : 1,
      Name: '',
      Description: '',
      UniqueId: this.generateGuid(),
    };

    this.commands.push(deviceObv);
    this.allCommands = this.commands;
    this.allCommands = [...this.allCommands];
    this.commands = [...this.commands];
    this.editing[this.allCommands.length - 1 + '-cell'] = true;
    this.editing[this.commands.length - 1 + '-cell'] = true;

    this.commandArguments = [];
    this.isShow = true;

    //this.addArguments();
    this.commandArguments = [];
  }

  addArguments() {
    console.log(this.commandArguments);
    if (
      typeof this.commandArguments == 'undefined' ||
      this.commandArguments == null
    ) {
      this.commandArguments = [];
    }

    let deviceObv = {
      Id:
        this.commandArguments.length > 0
          ? parseInt(
              this.commandArguments[this.commandArguments.length - 1]['Id']
            ) + 1
          : 1,
      Name: ' ',
      DataType: '',
      UniqueId: this.generateGuid(),
    };
    this.commandArguments.push(deviceObv);
    this.commandArguments = [...this.commandArguments];
    this.subEditing[this.commandArguments.length - 1 + '-cell'] = true;
  }

  onSelect(event) {
    this.CmdName = this.selected[0]['Name'];

    if (typeof this.selected[0]['Arguments'] != 'undefined') {
      this.commandArguments = this.selected[0]['Arguments'];
    } else {
      this.commandArguments = [];
    }
  }

  generateGuid(): string {
    var guid = GuidGenerator.uuidv4();
    return guid;
  }

  scrollDown() {
    let element = document.querySelector('#commands');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  }

  openAddCommandView() {
    this.addCommands(); //Add new row in template commands table
    this.scrollDown(); //Scroll down view to newly added row 
  }
}
