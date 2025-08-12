import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import {
  Router,
  NavigationEnd,
  RouterEvent,
  ActivatedRoute,
} from '@angular/router';
import { MenuItems } from '../../shared/menu-items/menu-items';
import { Subscription, Observable, forkJoin, fromEvent } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
} from 'rxjs/operators';
import { LocalStorageKeys, TrackStyles } from '../../core/constants';
import { MapType } from '../../core/enums';
import { MAP_TYPE_NAMES } from '../../core/constants';
import {
  SearchService,
  TemplateService,
  DeviceService,
  SiteSetting,
  AppSettings,
  LoggerService
} from '../../services';
import { isNullOrUndefined } from 'util';
import { LocalStorageService } from '../../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { TenantService } from 'src/app/services/tenant.service';

@Component({
  selector: 'app-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
})
export class AdminLayoutComponent {
  
}
