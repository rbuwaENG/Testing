import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  search: any;
  constructor() {}

  private searchValue = new Subject<any>();

  searchdValue$ = this.searchValue.asObservable();

  getSearchedValue(value: any) {
    this.searchValue.next(value);
  }
}
