import {
  Component,
  Input,
  ViewContainerRef,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DialogsService, LoggerService } from '../../services';
import {
  dataTypesConstant,
  historianConstant,
  LocalStorageKeys,
} from '../../core/constants';
import { Router } from '@angular/router';
import { GuidGenerator } from '../../core/helpers/guid-generator.helper';
import { MatDialog } from '@angular/material/dialog';
import { ObservationAddEditComponent } from './observation-add-edit/observation-add-edit.component';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';
import { EnumerationGroupDetails } from 'src/app/core/interfaces/template-enumeration.interface';
import { dataTypes } from 'src/app/core/constants/dataType-names';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-template-observations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-observations.component.html',
  styleUrls: ['./template-observations.component.scss'],
})
export class TemplateObservationsComponent {
  @Input() data: string;
  @Output() ObservationUpdated = new EventEmitter();
  @Input() units: QuantityItem[];

  observations = [];
  updatedObservations = [];
  serviceData = [];
  editing = {};
  dataTypes = {};
  historian = {};
  changedObservations = [];
  urlSearch = [];
  isView = false;
  isNew = false;
  isOriginalIdColumnVisible = false;
  defaultHistorianType;
  enumGroups: EnumerationGroupDetails[] = [];
  historianTypes = [
    { id: 0, name: 'All' },
    { id: 1, name: 'None' },
    { id: 2, name: 'HourlyStatistics' },
    { id: 3, name: 'DailyStatistics' },
  ];

  constructor(
    private dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private router: Router,
    private loggerService: LoggerService,
    public dialog: MatDialog,
    private localStorageService: LocalStorageService
  ) {
    this.dataTypes = dataTypesConstant;
    this.historian = historianConstant;
    this.defaultHistorianType = 0;
    this.urlSearch = this.router.url.split('/');
    if (this.urlSearch[3] != 'view') {
      this.isView = true;
    }
    if (this.urlSearch[3] == 'edit' && this.urlSearch[4] == 'new') {
      this.isNew = true;
    }
  }

  loadData() {
    if (this.data['Observations']) {
      this.serviceData = this.data['Observations'];
      this.setAbbreviation();
      this.observations = this.serviceData;
      this.updatedObservations = this.observations;
      this.updatedObservations = [...this.updatedObservations];
    }
    if (this.data['EnumerationGroups']) {
      this.enumGroups = this.data['EnumerationGroups'];
    }
    this.arrangeObservationsWithUnits();
  }

  unsetEditing() {
    this.editing = {};
  }

  ngDoCheck() {
    this.loadData();
  }

  setAbbreviation() {
    let unit = null;
    let quantities = this.localStorageService.getQuantities();

    this.observations.forEach((element) => {
      let quantity = quantities.find((x) => x.Id === element.Quantity);
      if (quantity.Units) {
        unit = quantity.Units.find((x) => x.Id === element.Unit);
      }
      if (element.Quantity === 1000) {
        unit = this.enumGroups.find((x) => x.Id === element.Unit);
      }
      element['UnitAbbreviation'] = unit.Abbreviation;
    });
  }

  arrangeObservationsWithUnits() {
    this.observations.forEach((obs) => {
      let selectedQuantity = this.units?.find((t) => t.Id == obs.Quantity);
      if (selectedQuantity) {
        obs.UnitName = '';
        if (selectedQuantity?.Units) {
          obs.UnitName = selectedQuantity.Units.find(
            (f) => f.Id == obs.Unit
          )?.Name;
        } else if (
          selectedQuantity.Id == dataTypes.emptyEnumQuntityOption.quantityId
        ) {
          //enumerations
          obs.UnitName = this.enumGroups.find((eg) => eg.Id == obs.Unit)?.Name;
        }
      }
    });
  }

  editObservation(rowIndex, row) {
    const dialogRef = this.dialog.open(ObservationAddEditComponent, {
      width: '700px',
      disableClose: true,
      data: {
        obsRowId: row.Id,
        obs: row,
        units: this.units,
        observations: this.observations,
        enumGroups: this.enumGroups,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result['data']) {
        result['data']['UniqueId'] = row.UniqueId;
        this.observations[rowIndex] = result['data'];
        this.ObservationUpdated.emit(result['data']);
      } else {
        this.loggerService.showErrorMessage('Observation edit cancelled!.');
      }
    });
  }

  validateTheNewId(event, row, rowIndex) {
    this.observations.forEach((observation) => {
      if (observation.$$index != rowIndex) {
        if (observation.Id == event.target.value) {
          this.loggerService.showErrorMessage(
            'The same template observation id is found in another observation.'
          );
          event.target.value = this.observations[rowIndex].Id;
        }
      }
    });
  }

  updateValue(event, cell, cellValue, row, rowIndex) {
    if (cell == 'Id') {
      this.validateTheNewId(event, row, rowIndex);
    }

    this.editing[rowIndex + '-' + cell] = false;
    this.observations[rowIndex][cell] = event.target.value;

    //emmit obj to the parent component
    this.ObservationUpdated.emit(row);
  }

  deleteObservation(observation, observationRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the observation?',
        true,
        this.viewContainerRef
      )
      .subscribe((res) => {
        if (res == true) {
          this.observations.splice(observationRow, 1);

          observation['IsDelete'] = true;
          this.ObservationUpdated.emit(observation);
        }
      });
  }

  addObservations() {
    let deviceObv = {
      Id:
        this.observations.length > 0
          ? parseInt(this.observations[this.observations.length - 1]['Id']) + 1
          : 1,
      Name: '',
      DataType: '',
      DerivedLevels: [],
      Description: '',
      Historian: '',
      ExpectedLoggingInterval: '',
      UniqueId: this.assignGuidForObservation(),
    };
    this.observations.push(deviceObv);
    this.updatedObservations = this.observations;
    this.updatedObservations = [...this.updatedObservations];
    this.observations = [...this.observations];
    this.editing[this.observations.length - 1 + '-cell'] = true;
  }

  openAddObservationView() {
    let obsRowId =
      this.observations.length > 0
        ? parseInt(this.observations[this.observations.length - 1]['Id']) + 1
        : 1;
    const dialogRef = this.dialog.open(ObservationAddEditComponent, {
      width: '700px',
      disableClose: true,
      data: {
        obsRowId: obsRowId,
        obs: null,
        units: this.units,
        observations: this.observations,
        enumGroups: this.enumGroups,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result['data'] != null) {
        result['data']['DerivedLevels'] = [];
        result['data']['ExpectedLoggingInterval'] = '';
        result['data']['UniqueId'] = this.assignGuidForObservation();

        this.observations.push(result['data']);
        this.updatedObservations = this.observations;
        this.updatedObservations = [...this.updatedObservations];
        this.observations = [...this.observations];
        this.setAbbreviation();
        this.scrollDown();
      }
    });
  }

  assignGuidForObservation(): string {
    var guid = GuidGenerator.uuidv4();
    return guid;
  }

  scrollDown() {
    let element = document.querySelector('#observations');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  }
}
