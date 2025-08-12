import {
  Component,
  Input,
  ViewContainerRef,
  Output,
  EventEmitter
} from '@angular/core';
import { DialogsService, LoggerService } from '../../services';
import { Router } from '@angular/router';
import { GuidGenerator } from '../../core/helpers/guid-generator.helper';

@Component({
  selector: 'app-template-pulses',
  templateUrl: './template-pulses.component.html',
  styleUrls: ['./template-pulses.component.scss']
})
export class TemplatePulsesComponent {
  @Input() data: string;
  @Output() PulseUpdated = new EventEmitter();

  pulses = [];
  counter = 0;
  editing = {};
  changedPulses = [];
  urlSearch = [];
  isView = false;
  isNew = false;

  allPulses = [];

  constructor(
    private dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private router: Router,
    private loggerService: LoggerService
  ) {
    this.urlSearch = this.router.url.split('/');
    if (this.urlSearch[3] != 'view') {
      this.isView = true;
    }
    if (this.urlSearch[3] == 'edit' && this.urlSearch[4] == 'new') {
      this.isNew = true;
    }
  }
  unsetEdting() {
    this.editing = {};
  }
  loadData() {
    if (this.data['Pulses']) {
      this.pulses = this.data['Pulses'];
      this.allPulses = this.pulses;
      this.allPulses = [...this.allPulses];
    }
  }
  ngDoCheck() {
    this.loadData();
  }

  validateTheNewId(event, row, rowIndex) {
    this.pulses.forEach(pulse => {
      if (pulse.$$index != rowIndex) {
        if (pulse.Id == event.target.value) {
          this.loggerService.showErrorMessage(
            'The same template pulse id is found in another pulse.'
          );
          event.target.value = this.pulses[rowIndex].Id;
        }
      }
    });
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    if (cell == 'Id') {
      this.validateTheNewId(event, row, rowIndex);
    }

    this.editing[rowIndex + '-' + cell] = false;
    this.pulses[rowIndex][cell] = event.target.value;

    //emmit obj to the parent component
    this.PulseUpdated.emit(row);
  }

  deletePulse(pulse, pulseRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the pulse?',
        true,
        this.viewContainerRef
      )
      .subscribe(res => {
        if (res == true) {
          this.pulses.splice(pulseRow, 1);
          pulse['IsDelete'] = true;

          this.PulseUpdated.emit(pulse);
        }
      });
  }

  addPulses() {
    let deviceObv = {
      Id:
        this.pulses.length > 0
          ? parseInt(this.pulses[this.pulses.length - 1]['Id']) + 1
          : 1,
      Name: '',
      Description: '',
      MaximumAbsence: '',
      UniqueId: this.assignGuidForPulse()
    };
    this.pulses.push(deviceObv);
    this.allPulses = this.pulses;
    this.allPulses = [...this.allPulses];
    this.pulses = [...this.pulses];
    this.editing[this.pulses.length - 1 + '-cell'] = true;
  }

  assignGuidForPulse(): string {
    var guid = GuidGenerator.uuidv4();
    return guid;
  }

  scrollDown() {
    let element = document.querySelector('#pulses');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }

  openAddPulseView() {
    this.addPulses(); //Add new row in template pulses table
    this.scrollDown(); //Scroll down view to newly added row 
  }
}
