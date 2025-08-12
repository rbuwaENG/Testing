import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';


@Component({
    selector: 'confirm-dialog',
    template: `   
    <div mat-dialog-content> 
        <p>{{dialogMessage}}</p>
    </div>  
    <input matInput [(ngModel)]="data.status" hidden="true"> 
    <div mat-dialog-actions style="
        display: flex;
        justify-content: space-between;
        align-items: center;
    ">
        <button mat-raised-button (click)='onCancelClick()' cdkFocusInitial>{{cancelText}}</button>
        <button mat-raised-button color="primary" [mat-dialog-close]="data.status">Yes</button>
    </div>`,
    //styles: ['dialog-overview-example.css'],
})

export class DeleteConfirmDialogComponent {

    dialogMessage = "Are you sure, you want to delete selected user?";
    cancelText = "Cancel"

    constructor(public dialogRef: MatDialogRef<DeleteConfirmDialogComponent>, private translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
          data.status = true;
    }

    onCancelClick(): void {
        this.dialogRef.close();
    }
}