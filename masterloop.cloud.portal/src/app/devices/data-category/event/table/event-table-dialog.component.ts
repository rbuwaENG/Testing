import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    template: `<div
    style="word-wrap: break-word; overflow-x: hidden; height: 100% !important;position: relative;"
  >
    <h5 class="mt-0">Event Details</h5>

    <div class="row">
      <div class="column">Timestamp : {{ eventDetails.Timestamp }}</div>
    </div>
    <div class="row">
      <div class="column">Origin : {{ eventDetails.Origin }}</div>
    </div>
    <div class="row">
      <div class="column">Category : {{ eventDetails.Category }}</div>
    </div>
    <div class="row">
      <div class="column">Title : {{ eventDetails.Title }}</div>
    </div>
    <div class="row">
      <div class="column">Body : {{ eventDetails.Body }}</div>
    </div>

    <button
      mat-button
      type="button"
      (click)="dialogRef.close()"
      style="position: absolute; bottom: 0px; right: 0px; background-color:#efefef"
    >
      Close
    </button>
  </div>`,
  })

  export class EventTableOverflowComponent {
    @Input() eventDetails : EventDetails;

    constructor(public dialogRef: MatDialogRef<EventTableOverflowComponent>) {}
  }  

  export interface EventDetails {
    Timestamp: string;
    Origin: string;
    Category: string;
    Title: string;
    Body: string;
  }