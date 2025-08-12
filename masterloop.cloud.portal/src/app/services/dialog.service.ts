import { Observable } from 'rxjs';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import {
  MatDialogRef,
  MatDialog,
  MatDialogConfig
} from '@angular/material/dialog';
import { Injectable, ViewContainerRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DialogsService {
  constructor(private dialog: MatDialog) {}

  public confirm(
    title: string,
    message: string,
    isErrorNessage: boolean,
    viewContainerRef: ViewContainerRef,
    filename?: string
  ): Observable<any> {
    let dialogRef: MatDialogRef<ConfirmDialogComponent>;
    let config = new MatDialogConfig();
    config.viewContainerRef = viewContainerRef;

    dialogRef = this.dialog.open(ConfirmDialogComponent, config);
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;
    dialogRef.componentInstance.isErrorMessage = isErrorNessage;
    dialogRef.componentInstance.fileName = filename;

    return dialogRef.afterClosed();
  }

  public confirmation(message?: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      setTimeout(() => {
        let ok = window.confirm(message);
        return resolve(ok);
      }, 0);
    });
  }
}
