import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SelectedObservationsService {
  search: any;
  constructor() {}

  private selectedObservations = new Subject<any>();

  selectedObservations$ = this.selectedObservations.asObservable();

  getSelectedValues(value: any) {
    this.selectedObservations.next(value);
  }
}
