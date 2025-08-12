import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class MenuUpdateService {

    search: any;
    constructor() {}

    private menuUpdated = new Subject<any>();
    private dashboardChanged = new Subject<any>();

    menudUpdated$ = this.menuUpdated.asObservable();
    dashboardChanged$ = this.dashboardChanged.asObservable();

    getMenuUpdatedValue(value: any) {
        this.menuUpdated.next(value);
    }
    //handle device dashboard change event
    getDashboardChangedValue(message: any) {
        this.dashboardChanged.next(message)
    }
    
}