import { Component, Input, ViewContainerRef, Output, EventEmitter } from '@angular/core';
import { DialogsService, LoggerService } from '../../services';
import { Router } from '@angular/router';
import { GuidGenerator } from '../../core/helpers/guid-generator.helper';
import { EnumerationAddEditComponent } from './enumeration-add-edit/enumeration-add-edit.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-template-enumeration',
  templateUrl: './template-enumeration.component.html',
  styleUrls: ['./template-enumeration.component.scss']
})
export class TemplateEnumerationComponent {

  @Input() data: string;
  @Output() enumerationUpdated = new EventEmitter();

  editing = {};
  enumerationGroups = [];
  serviceData = [];
  changedEnumerationGroups = [];
  urlSearch = [];
  isView = false;
  isNew = false;
  allEnumerationGroups = [];

  constructor(
    private dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private router: Router,
    private loggerService: LoggerService,
    public dialog: MatDialog
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
    if (this.data['EnumerationGroups']) {
      this.serviceData = this.data['EnumerationGroups'];
      this.enumerationGroups = this.serviceData;
      this.allEnumerationGroups = this.enumerationGroups;
      this.allEnumerationGroups = [...this.allEnumerationGroups];
    }
  }

  ngDoCheck() {
    this.loadData();
  }

  deleteEnumerationGroup(enumerationGroup, enumerationGroupRow) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the enumeration group?',
        true,
        this.viewContainerRef
      )
      .subscribe(res => {
        if (res == true) {
          this.enumerationGroups.splice(enumerationGroupRow, 1);
          this.allEnumerationGroups = this.enumerationGroups;
          this.allEnumerationGroups = [...this.allEnumerationGroups];
          enumerationGroup['IsDelete'] = true;
          this.enumerationUpdated.emit(enumerationGroup);
        }
      });
  }

  scrollDown() {
    let element = document.querySelector('#enumerationGroups');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }

  openAddEnumerationView() {
    let enumRowId = this.enumerationGroups.length > 0
      ? parseInt(this.enumerationGroups[this.enumerationGroups.length - 1]['Id']) + 1 : 1;

    const dialogRef = this.dialog.open(EnumerationAddEditComponent, {
      width: '700px',
      disableClose: true,
      data: {
        enumRowId: enumRowId,
        enumGroup: null,
        enumGroups: this.enumerationGroups
      },
      panelClass: 'add-enum-popup'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result['data'] != null) {
        result['data']['UniqueId'] = this.assignGuidForEnumGroup();

        this.enumerationGroups.push(result['data']);      
        this.allEnumerationGroups = this.enumerationGroups;
        this.allEnumerationGroups = [...this.allEnumerationGroups];
        this.enumerationGroups = [...this.enumerationGroups]
        this.scrollDown();
      }
    });
  }

  getEnumerationItemsString(enumerationItems) {
    if (!enumerationItems)
      return '';

    let enumItemString = '';
    enumerationItems.forEach((element) => {
      enumItemString = enumItemString.concat(element.Id + '=' + element.Name + ', ');
    });
    enumItemString = enumItemString.substring(0, enumItemString.length - 2);
    return enumItemString;
  }

  editEnumerationGroup(rowIndex, row) {
    const dialogRef = this.dialog.open(EnumerationAddEditComponent, {
      width: '700px',
      disableClose: true,
      data: {
        enumRowId: row.Id,
        enumGroup: row,
        enumGroups: this.enumerationGroups
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result['data']) {
        result['data']['UniqueId'] = row.UniqueId;

        this.enumerationGroups = result['data'];       
        this.enumerationUpdated.emit(result['data']);
      } else {
        this.loggerService.showErrorMessage('Enumeration group edit cancelled!.');
      }
    });
  }

  assignGuidForEnumGroup(): string {
    var guid = GuidGenerator.uuidv4();
    return guid;
  }
}
