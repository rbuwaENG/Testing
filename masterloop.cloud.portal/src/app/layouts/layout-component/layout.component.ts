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
import { Subscription, Observable, forkJoin, fromEvent, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
} from 'rxjs/operators';
import { LocalStorageKeys, TrackStyles } from '../../core/constants';
import { ThemeStyles } from '../../core/constants/theme-styles-constants';
import { MapType } from '../../core/enums';
import { MAP_TYPE_NAMES } from '../../core/constants';
import {
  SearchService,
  TemplateService,
  DeviceService,
  SiteSetting,
  AppSettings,
  LoggerService,
} from '../../services';
import { isNullOrUndefined } from 'util';
import { LocalStorageService } from '../../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { TenantService } from 'src/app/services/tenant.service';
import { MenuItemsCss } from '../../core/constants/menu-item-css';
import { MenuUpdateService } from 'src/app/services/menu-update.service';

@Component({
  selector: 'app-test-component',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit {
  @ViewChild('appDrawer') appDrawer: ElementRef;
  clickEventsubscription: Subscription;

  private _router: Subscription;
  public enableReduceMapPoints;
  /* for geneation of selectable maptypes .... */
  public readonly availableMapTypes: any[];
  /* store selected maptype ... */

  public selectedMapType: MapType;

  public selectedTemplates;
  today: number = Date.now();
  url: string;
  search: string;
  version: string;
  alreadySelectedTemplates = [];
  listOfTemplates = [];
  selectAllTemplates: boolean;
  isTextChange: boolean;
  selectedTemplate: string;

  expanded: boolean = false;
  step = 0;

  showLoggedUser: boolean = false;
  loggedUserName = '';
  tenantsList;

  @ViewChild('sidemenu') sidemenu;
  @ViewChild('searchElement', { static: true }) searchElement: ElementRef;

  public selectedTrackStyle: any;
  listOfTrackStyles: any[];
  public selectedThemeStyle: string;
  listOfThemeStyles: any[];

  //search related
  public searchText: string;
  public searchTextModelChanged: Subject<string> = new Subject<string>();
  public searchTextModelChangeSubscription: Subscription;

  //cookie bar related
  agreedToUseCookies: boolean = false;

  //theme
  isDarkMode: boolean;

  constructor(
    public menuItems: MenuItems,
    private router: Router,
    private templateService: TemplateService,
    private deviceService: DeviceService,
    private siteSetting: SiteSetting,
    protected appSettings: AppSettings,
    protected cache: LocalStorageService,
    protected loggerService: LoggerService,
    public searchService: SearchService,
    public route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private dbService: NgxIndexedDBService,
    private menuUpdateService: MenuUpdateService,
    private tenantService: TenantService
  ) {
    //set app theme
    this.siteSetting.initTheme();
    this.isDarkMode = this.siteSetting.themeType.getValue() === ThemeStyles.darkMode;

    this.siteSetting.trackStyle.setValue(TrackStyles.trackStyles[0]);
    this.enableReduceMapPoints = this.siteSetting.reduceMapPoints.getValue();
    /* load selected map-type from settings... */
    this.selectedMapType = this.siteSetting.mapType.getValue();
    /* populate array for repeating of options... */
    this.availableMapTypes = Object.keys(MapType)
      .filter((m: any) => !isNaN(m))
      .map((m) => Number(m))
      .map((m) => {
        return { name: MAP_TYPE_NAMES[m], value: m };
      });

    this.getTenantsList();

    this.selectedTemplates = this.siteSetting.selectedTemplates.getValue();

    this.menuUpdateService.menudUpdated$.subscribe((data) => {
      this.getDevicesWithTemplates();
    });

    this.listOfTrackStyles = TrackStyles.trackStyles;

    this.selectedTrackStyle = this.siteSetting.trackStyle.getValue()['name'];

    this.listOfThemeStyles = ThemeStyles.modes;

    this.selectedThemeStyle = this.siteSetting.themeType.getValue();

    //Search function
    this.searchTextModelChangeSubscription = this.searchTextModelChanged
      .pipe(debounceTime(800))
      .subscribe(async (newText) => {
        this.searchText = newText;
        if (this.router.url == '/templates') {
          this.searchService.getSearchedValue(this.searchText);
        } else if (this.router.url == '/devices/all') {
          this.searchService.getSearchedValue(this.searchText);
        } 
        else {
          let succeeded = await this.router.navigate([
            'devices',
            'all'
          ]);
          if (succeeded) {
            this.searchService.getSearchedValue(this.searchText);
          }
        }
      });
  }

  checkCookiesAccepted() {
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let acceptCookies = url + '_' + userName + '_accept_cookies';
    this.agreedToUseCookies = JSON.parse(localStorage.getItem(acceptCookies));
  }

  agreeToUseCookies() {
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let acceptCookies = url + '_' + userName + '_accept_cookies';
    localStorage.setItem(acceptCookies, JSON.stringify(true));
    this.agreedToUseCookies = true;
  }

  getTenantsList() {
    this.tenantService.getTenants().subscribe((data) => {
      if (data.length > 0) {
        this.tenantsList = data;
        this.tenantsList.sort((a, b) => a.Name.localeCompare(b.Name));
        let tenants = (<any>this.menuItems.getAll()).filter(
          (e) => e.state == 'tenants'
        );
        if (this.tenantsList != null) {
          let tenantList = [];
          let allTenant = {};
          allTenant['state'] = 'tenantList';
          allTenant['count'] = '';
          allTenant['selected'] = false;
          allTenant['name'] = 'All Tenants';
          allTenant['url'] = 'tenants';
          tenantList.push(allTenant);
          this.tenantsList.forEach((tenant) => {
            let val = {};
            val['state'] = 'tenantList';
            val['count'] = '';
            val['selected'] = false;
            val['name'] = tenant['Name'];
            val['url'] = 'tenants/' + tenant['Id'] + '/users';
            tenantList.push(val);
          });
          tenants[0].children = tenantList;
        }
      }
    });
  }
  /**
   * Update when template is selected
   * @param value
   */
  onTemplateSelection(value: boolean = null): void {
    this.siteSetting.changeTemplateSelection.setValue(
      (this.selectedTemplates = !isNullOrUndefined(value)
        ? value
        : this.selectedTemplates)
    );
  }
  //clear current search value when click on menu item
  clearSearch() {
    this.searchService.search = '';
    this.searchText = '';
  }

  ngOnInit(): void {
    //when initialization, search box will have the focus
    if (
      !(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) && document.documentElement.clientWidth < 768
      )
    ) {
      if (this.searchService.search != '') {
        setTimeout(() => this.searchElement.nativeElement.focus());
      }
    }
    this._router = this.router.events
      .pipe(
        filter(
          (event: RouterEvent): event is RouterEvent =>
            event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        this.url = event.url;

        //highlight the selected template menu item
        if (event.url != 'undefined' && event.url != null) {
          let template = event.url.split(/[\s/]+/);
          this.selectedTemplate = template[template.length - 1];
          if (this.selectedTemplate == 'all') {
            this.selectedTemplate = 'All Devices';
          }
        } else {
          this.selectedTemplate = null;
        }

        if (this.isOver()) this.sidemenu.close();
      });

    /**
     * Check last updated time of device list and update
     */
    this.handleExpansion();
    //this.checkCacheLastUpdated();
    this.getDevicesWithTemplates();
    this.detectRefresh();
    this.displayLoggedUserName();
    this.version = this.appSettings.production_version;
    this.checkCookiesAccepted();
  }

  displayLoggedUserName() {
    let userInfo = JSON.parse(localStorage.getItem(LocalStorageKeys.USER_INFO));
    if (userInfo != null) {
      this.showLoggedUser = true;
      this.loggedUserName = userInfo['FirstName'] + ' ' + userInfo['LastName'];
    }
  }

  setStep(index: number) {
    this.step = index;
  }

  ngAfterViewInit() {
    //this.handleExpansion();
    this.cdr.detectChanges();
  }

  handleExpansion() {
    let menus = this.menuItems.getAll();
    let currentUrl = this.router.url.trim();
    let urlSet = currentUrl.split('/');
    menus.forEach((menu) => {
      if (menu.type == 'sub') {
        if (urlSet[1] == 'analyzer') {
          let device = menus.filter((m) => m.state == 'devices');
          let other = menus.filter((m) => m.state == 'analyzer');
          let tenant = menus.filter((m) => m.state == 'tenants');
          device[0]['open'] = false;
          other[0]['open'] = true;
          tenant[0]['open'] = false;
        }
        if (urlSet[1] == 'devices') {
          let other = menus.filter((m) => m.state == 'devices');
          let analyzer = menus.filter((m) => m.state == 'analyzer');
          let tenant = menus.filter((m) => m.state == 'tenants');
          other[0]['open'] = true;
          analyzer[0]['open'] = false;
          tenant[0]['open'] = false;
        }
        if (urlSet[1] == 'tenants') {
          let other = menus.filter((m) => m.state == 'devices');
          let analyzer = menus.filter((m) => m.state == 'analyzer');
          let tenant = menus.filter((m) => m.state == 'tenants');
          other[0]['open'] = false;
          analyzer[0]['open'] = false;
          tenant[0]['open'] = true;
        }
      }
    });
  }

  checkCacheLastUpdated() {
    var lastUpdated = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LAST_SYNC_DEVICE_LIST)
    );
    let now = Date.now();
    let diff = now - lastUpdated;
    let diffInHours = Math.abs(Math.round(diff / (1000 * 3600)));
    if (diffInHours >= 1) {
      this.updateTemplatesDevicesCache();
    } else {
      console.log('Last updated time gap is', diffInHours, 'hours');
    }
  }

  getDevicesWithMetaData() {
    this.deviceService.getDeviceMetaAndDeviceData('false', 'true').subscribe(
      (devices) => {
        localStorage.setItem(
          LocalStorageKeys.LAST_SYNC_DEVICE_LIST,
          JSON.stringify(new Date().getTime())
        );
      },
      (error) => {
        this.loggerService.showErrorMessage(
          `Getting devices with metadata failed!`
        );
      }
    );
  }

  formatTimeDuration(ts) {
    var diffDays = Math.abs(Math.round(ts / (1000 * 3600 * 24)));
    var diffHours = Math.abs(Math.round(ts / (1000 * 3600)));
    var diffMinutes = Math.abs(Math.round(ts / (1000 * 60)));
    var diffSeconds = Math.abs(Math.round(ts / 1000));

    if (diffDays > 1) {
      return diffDays + ' days ago';
    } else if (diffHours > 1) {
      if (diffHours >= 24 && diffDays == 1) {
        return diffDays + ' day ago';
      } else {
        return diffHours + ' hours ago';
      }
    } else if (diffMinutes > 1) {
      if (diffMinutes >= 60 && diffHours == 1) {
        return diffHours + ' hour ago';
      } else {
        return diffMinutes + ' minutes ago';
      }
    } else {
      if (diffSeconds >= 60 && diffMinutes == 1) {
        return diffMinutes + ' minute ago';
      } else {
        return diffSeconds + ' seconds ago';
      }
    }
  }

  //check that search box text is changed
  updateModelChange(text: string): void {
    // if (localStorage.getItem('searchText') !== text) {
    //   localStorage.setItem('searchText', text);
    //   this.isTextChange = true;
    // }
  }

  /**
   * Updates the search text to shared service. If current page is template listing, we filter by search, else we navigate to device-listing
   * before filtering the device...
   * @param event
   */
  updateSearchText(event) {
    // if (this.router.url == '/templates') {
    //   this.searchService.getSearchedValue(event);
    // } else {
    //   fromEvent(this.searchElement.nativeElement, 'keyup')
    //     .pipe(
    //       // get value
    //       map((event: any) => {
    //         return event.target.value;
    //       }),
    //       //, filter(res => res.length > 2)
    //       debounceTime(800)
    //       , distinctUntilChanged()
    //     )
    //     .subscribe((text: string) => {
    //       //this.navigateToDeviceListing();
    //       this.searchService.getSearchedValue(event);
    //     });
    //}
  }

  navigateToDeviceListing() {
    this.router.navigateByUrl('/devices/all');
  }

  /** Determines if sidemenu should be colapsed.... */
  isOver(): boolean {
    return (
      this.url === '/apps/messages' ||
      this.url === '/apps/calendar' ||
      this.url === '/apps/media' ||
      window.matchMedia(`(max-width: 960px)`).matches
    );
  }

  /**
   * Composes route link params as URL ....
   */
  composeRouteLink(...params: any[]): string {
    return this.router
      .createUrlTree(
        params.reduce((result, current) => {
          Array.prototype.push.apply(
            result,
            !Array.isArray(current) ? [current] : current
          );
          return result;
        }, [])
      )
      .toString();
  }

  getDevicesWithTemplates() {
    var cachedTemplates = JSON.parse(
      localStorage.getItem(LocalStorageKeys.CACHED_TEMPLATES)
    );
    let cachedDevices = null;
    this.dbService.count('devices').subscribe((recordCount) => {
      if (recordCount > 0) {
        this.dbService.getAll('devices').subscribe((devices) => {
          cachedDevices = devices[0].Value;
          if (cachedDevices != null && cachedTemplates != null) {
            this.createMenuWithData(cachedDevices, cachedTemplates);
          }
        });
      } else {
        //this.updateTemplatesDevicesCache();
      }
    });
    if (cachedDevices == null && cachedTemplates == null) {
      //this.updateTemplatesDevicesCache();
    }
  }

  updateTemplatesDevicesCache() {
    forkJoin([
      this.templateService.getTemplates(),
      this.deviceService.getDeviceMetaAndDeviceData('false', 'true')
    ])
      .pipe(
        map((data) => {
          return { templates: data[0], devices: data[1] };
        })
      )
      .subscribe((data) => {
        this.listOfTemplates = data.templates;
        localStorage.setItem(
          LocalStorageKeys.CACHED_TEMPLATES,
          JSON.stringify(data.templates)
        );
        this.dbService
          .add('devices', {
            Id: 1,
            Value: data.devices,
          })
          .subscribe(
            (storeData) => {
              this.createMenuWithData(data.devices, data.templates);
            },
            (error) => {
              console.log('db key already exist');
            }
          );
      });
  }

  getBaseUrl() {
    const parsedUrl = new URL(window.location.href);
    const baseUrl = parsedUrl.origin;
    return baseUrl;
  }


  A(item) {
    let allItems = (<any>this.menuItems.getAll()).filter(
      (e) => e.state == 'devices'
    );
    let selectedMenuItem = allItems[0]['children'].filter(
      (e) => e.url == item.url
    );
    
    
    allItems =  allItems[0]['children'].map(ele => {
      if(ele.state == 'recent' || ele.state == 'all' || ele.state == 'found' || ele.state == 'starred') {
        ele.class = MenuItemsCss.MAIN_SECTION;
      }  else if(ele.state == 'listingbytemplate' || ele.state == 'listingbyrecent' || ele.state == 'listingbyfavorite' || ele.state == 'listingbyfound') {
        ele.class = MenuItemsCss.SUB_SECTION;
      } else {
        ele.class = MenuItemsCss.SUB_SECTION;
      }
      return ele;
  });
  
  switch(selectedMenuItem[0].state) {
      case "recent":
        selectedMenuItem[0].class = MenuItemsCss.MAIN_SECTION_OPEN;
        break;
        case "starred":
        selectedMenuItem[0].class = MenuItemsCss.MAIN_SECTION_OPEN;
        break;
        
      case "found":
        selectedMenuItem[0].class = MenuItemsCss.MAIN_SECTION_OPEN;
        break;        
      case "all":
        selectedMenuItem[0].class = MenuItemsCss.MAIN_SECTION_OPEN;
        break;
      case "listingbytemplate":
        selectedMenuItem[0].class = MenuItemsCss.SUB_SECTION_OPEN;
        break;
      case "listingbyrecent":
        selectedMenuItem[0].class = MenuItemsCss.SUB_SECTION_OPEN;
        break;
      case "listingbyfavorite":
        selectedMenuItem[0].class = MenuItemsCss.SUB_SECTION_OPEN;
        break;
      case "listingbyfound":
        selectedMenuItem[0].class = MenuItemsCss.SUB_SECTION_OPEN;
        break;  
      default:
        selectedMenuItem[0].class = MenuItemsCss.SUB_SECTION_OPEN;
    }  
    
  }

  createMenuWithData(deviceList, templateList) {
    this.menuItems.clearDevices();
    let devices = (<any>this.menuItems.getAll()).filter(
      (e) => e.state == 'devices'
    );

    let selectedStatus = localStorage.getItem(
      LocalStorageKeys.SELECT_ALL_TEMPLATES
    );
    let selectedTemplates = JSON.parse(
      localStorage.getItem(LocalStorageKeys.SELECTED_TEMPLATES)
    );

    devices = !devices.length ? null : devices[0]; //Getting fisrt devices state

    devices.children[0].count = deviceList.length;
    devices.children[0].name = `All Devices (${deviceList.length})`;
    devices.children[0].class = 'main-section';
    templateList = this.sortArray(templateList);
    Array.prototype.push.apply(
      devices.children,
      templateList.map((elem) => {
        return {
          state: 'listingbytemplate',
          selected:
            localStorage.getItem(LocalStorageKeys.SELECT_ALL_TEMPLATES) ==
            'true',
          templateName: elem.Id,
          url: this.composeRouteLink(
            '/',
            devices.state,
            'listingbytemplate',
            elem.Id
          ),
          name: `${elem.Id} (${
            deviceList.filter((e) => e.TemplateId == elem.Id).length
          })`,
          class:'sub-section'
        };
      })
    );
    devices.children.forEach((device, deviceIndex) => {
      selectedTemplates.forEach((template, index) => {
        if (selectedStatus == 'true') {
          if (device.templateName == 'All') {
            device.selected = 'true';
          }
        }
        if (template == device.templateName) {
          device.selected = 'true';
        }
      });
    });

    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKeyRecent = url + '-' + userName + 'recent';
    let localStorageKeyFavorite = url + '-' + userName + 'favorite';
    let localStorageKeyFoundDevices =
      url + '_' + userName + '_' + LocalStorageKeys.FOUND_DEVICE_LIST;

    //get recent and my device count
    let storedRecentDevices = JSON.parse(
      localStorage.getItem(localStorageKeyRecent)
    );
    let storedMyDevices = JSON.parse(
      localStorage.getItem(localStorageKeyFavorite)
    );

    let storedFoundDevices = JSON.parse(
      localStorage.getItem(localStorageKeyFoundDevices)
    );

    let recentDevicesLength = 0;
    let myDevicesLength = 0;
    let foundDevicesLength = 0;

    if (storedRecentDevices != null) {
      recentDevicesLength = storedRecentDevices.length;
    }
    if (storedMyDevices != null) {
      myDevicesLength = storedMyDevices.length;
    }

    if (storedFoundDevices != null) {
      foundDevicesLength = storedFoundDevices.length
    }
    //Adding Recent and My devices
    let recentMenuItems = { 
      state: 'recent', 
      url: this.composeRouteLink('/','devices','filter','recent'),   
      name: `Recent Devices (${recentDevicesLength})`, 
      count: '',  
      selected: false, 
      class : 'main-section',
      children:[] };
    devices.children.splice(0, 0, recentMenuItems);
    
    if(storedRecentDevices != null) {
      Array.prototype.push.apply(
        recentMenuItems.children,
        templateList.map((elem) => {
          if(storedRecentDevices.filter((e) => e.TemplateId == elem.Id).length > 0) {
            return {
              state: 'listingbyrecent',
              selected: 'true',
              templateName: elem.Id,
              url: this.composeRouteLink('/','devices','filter','recent',elem.Id),
              name: `${elem.Id} (${storedRecentDevices.filter((e) => e.TemplateId == elem.Id).length})`,
              class: 'sub-section'
            };
          }
        })
      );
    }
    recentMenuItems.children = recentMenuItems.children.filter(function(x) {
      return x !== undefined;
    });
    let j=0;
    let i = 1;
    if(recentMenuItems.children.length > 0) {      
      for (i = 1; i <= recentMenuItems.children.length; i++) {
        devices.children.splice(i, 0, recentMenuItems.children[j]);
        j++;
      }
    }
    

    let myDeviceMenuItem = { 
      state: 'starred', 
      url: this.composeRouteLink('/','devices','filter','starred'), 
      name: `Starred Devices (${myDevicesLength})`, count: '', 
      selected: false, 
      class : 'main-section',
      children:[] };
    devices.children.splice(i++, 0, myDeviceMenuItem);

    
    
    if(storedMyDevices != null) {
      Array.prototype.push.apply(
        myDeviceMenuItem.children,
        templateList.map((elem) => {
          if(storedMyDevices.filter((e) => e.TemplateId == elem.Id).length > 0) {
            return {
              state: 'listingbyfavorite',
              selected: 'true',
              templateName: elem.Id,
              url: this.composeRouteLink('/','devices','filter','starred',elem.Id),
              name: `${elem.Id} (${storedMyDevices.filter((e) => e.TemplateId == elem.Id).length})`,
              class: 'sub-section'
            };
          }
        })
      );
      
    }
    myDeviceMenuItem.children = myDeviceMenuItem.children.filter(function(x) {
      return x !== undefined;
    });

    let a= 0;
    if(myDeviceMenuItem.children.length > 0) {      
      for (a ; a < myDeviceMenuItem.children.length; ++a) {
        devices.children.splice(i, 0, myDeviceMenuItem.children[a]);
        i++;
      }
    }
    let foundDeviceMenuSelected = false;
    let color = "main-section";
    if(this.searchText != null || typeof this.searchText != "undefined") {
      foundDeviceMenuSelected = true;
      color = " main-section";
    }

    let foundDevicesMenuItem = {
      state: 'found',
      url: this.composeRouteLink('/', 'devices', 'filter', 'found'),
      name: `Found Devices (${foundDevicesLength})`,
      count: '',
      selected: foundDeviceMenuSelected,
      class: color,
      children:[]
    };

  

      devices.children.splice(i++, 0, foundDevicesMenuItem);
    
    if(storedFoundDevices != null) {
      Array.prototype.push.apply(
        foundDevicesMenuItem.children,
        templateList.map((elem) => {
          if(storedFoundDevices.filter((e) => e.TID == elem.Id).length > 0) {
            return {
              state: 'listingbyfound',
              selected: 'true',
              templateName: elem.Id,
              url: this.composeRouteLink('/','devices','filter','found',elem.Id),
              name: `${elem.Id} (${storedFoundDevices.filter((e) => e.TID == elem.Id).length})`,
              class: 'sub-section'
            };
          }
        })
      );
      
    }
    foundDevicesMenuItem.children = foundDevicesMenuItem.children.filter(function(x) {
      return x !== undefined;
    });

    let f= 0;
    if(foundDevicesMenuItem.children.length > 0) {      
      for (f ; f < foundDevicesMenuItem.children.length; ++f) {
        devices.children.splice(i, 0, foundDevicesMenuItem.children[f]);
        i++;
      }
    }

    
  }

  sortArray(array: any[]): Observable<any>[] {
    array.sort((a: any, b: any) => a.Id.localeCompare(b.Id));
    return array;
  }

  /**
   * Update reduceMapPoints status to setting service. If not status is passed, current status is used...
   * @param value status to set
   */
  onPointReductionToggled(value: boolean = null): void {
    this.siteSetting.reduceMapPoints.setValue(
      (this.enableReduceMapPoints = !isNullOrUndefined(value)
        ? value
        : this.enableReduceMapPoints)
    );
  }

  /**
   * Update maptype to setting on radio option change ...
   * @param value new selected value
   */
  onSelectedMapTypeChanged(value: MapType) {
    this.siteSetting.mapType.setValue((this.selectedMapType = value));
  }

  /**
   * Detect page refresh and remove device cache element from local storage
   */
  detectRefresh() {
    window.onbeforeunload = function (e) {
      //this.cache.clearDeviceListCache();
      //localStorage.removeItem(LocalStorageKeys.LAST_SYNC_DEVICE_LIST);
      //localStorage.removeItem(LocalStorageKeys.CACHED_TEMPLATES);
      //sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
    };
  }

  ngOnDestroy() {
    this.menuItems.clearDevices();
    this._router.unsubscribe();
  }

  onSelectedTrackStyleChanged(value) {
    this.siteSetting.trackStyle.setValue((this.selectedTrackStyle = value));
  }

  onToggleDarkMode(theme: string) {
    this.isDarkMode = theme === ThemeStyles.darkMode;
    this.siteSetting.themeType.setValue(theme);
    if (this.isDarkMode)
      this.onSelectedMapTypeChanged(MapType.Dark);
    else
      this.onSelectedMapTypeChanged(MapType.Standard);
  }
}
