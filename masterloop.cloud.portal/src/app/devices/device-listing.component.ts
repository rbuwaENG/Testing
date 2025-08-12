import {
  Component,
  OnInit,
  ViewContainerRef,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  AppSettings,
  DeviceService,
  LoggerService,
  SearchService,
  SiteSetting,
  TemplateService,
} from '../services';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { isNullOrUndefined } from 'util';
import { LocalStorageKeys } from '../core/constants';
import { DeviceActivityColors } from '../core/constants/device-activity-colors';
import { LocalStorageService } from '../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { FormControl } from '@angular/forms';
import * as moment from 'moment';
import { multicast } from 'rxjs/operators';
import { MenuUpdateService } from '../services/menu-update.service';
import { userPermissionService } from '../services/user-permission.service';

@Component({
  selector: 'app-device-listing',
  templateUrl: './device-listing.component.html',
  styleUrls: ['./device-listing.component.scss'],
})
export class DeviceListingComponent {
  @ViewChild('deviceListTable') table: any;

  public showActiveDevices;
  public changeTemplateSelection;

  temp = [];
  columns = [];
  devices = [];
  currentPage: number = 0;
  urlSearch = [];
  lastDevice: any;
  TID: any;
  isMobile: boolean = false;
  isTab: boolean = false;
  expanded: any = {};
  lastSyncTime: any;
  syncTime: any;
  isLoading: boolean = true;
  selectedFilter: any;
  filterBy: any;
  isCompact: boolean = false;

  filterOptions = [
    { Id: '1', Value: 'All Devices' },
    { Id: '2', Value: 'Recent Devices' },
    { Id: '3', Value: 'My Devices' },
  ];
  deviceStatuses = [
    DeviceActivityColors.GREEN,
    DeviceActivityColors.AMBER,
    DeviceActivityColors.RED,
    DeviceActivityColors.GRAY,
  ];

  statuses = [
    {
      Id: DeviceActivityColors.GREEN,
      Value: DeviceActivityColors.GREEN,
      ToolTip: 'Last Device Pulse: less than 2 hours ago',
      Label: 'Online',
    },
    {
      Id: DeviceActivityColors.AMBER,
      Value: DeviceActivityColors.AMBER,
      ToolTip: 'Last Device Pulse: between 2 and 24 hours ago',
      Label: 'Offline (<24 hours)',
    },
    {
      Id: DeviceActivityColors.RED,
      Value: DeviceActivityColors.RED,
      ToolTip: 'Last Device Pulse: more than 1 day ago',
      Label: 'Offline',
    },
    {
      Id: DeviceActivityColors.GRAY,
      Value: DeviceActivityColors.GRAY,
      ToolTip: 'Last Device Pulse: never',
      Label: 'Never connected',
    },
  ];

  isDeviceFavorite: boolean;
  currentSelectedFolder: string;
  searchedText;
  selectedView;
  deviceSearch = '';
  loggedUserEmail;
  currentSystemUrl;
  isEditable = {};

  constructor(
    private deviceService: DeviceService,
    private router: Router,
    private loggerService: LoggerService,
    private route: ActivatedRoute,
    private searchService: SearchService,
    protected siteSetting: SiteSetting,
    private templateService: TemplateService,
    private cache: LocalStorageService,
    private dbService: NgxIndexedDBService,
    private cdr: ChangeDetectorRef,
    private userPermission: userPermissionService,
    private appSettings: AppSettings,
    private menuUpdateService: MenuUpdateService
  ) {
    this.searchService.searchdValue$.subscribe((data) => {
      this.searchedText = data;
      this.updateGlobalSearch((this.lastDevice = data));
    });

    this.showActiveDevices = this.siteSetting.showActiveDevices.getValue();
    this.changeTemplateSelection =
      this.siteSetting.changeTemplateSelection.getValue();
    this.deviceStatuses = this.siteSetting.deviceStatusFilter.getValue();
    this.siteSetting.showActiveDevices.valueChanges.subscribe((data) => {
      this.showActiveDevicesOnly();
    });

    this.siteSetting.changeTemplateSelection.valueChanges.subscribe((data) => {
      this.showActiveDevicesOnly();
    });

    this.siteSetting.deviceStatusFilter.valueChanges.subscribe((data) => {
      this.devicesFilteredByStatus(data);
    });
    /**Handles url navigation on same url**/
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
    /**Mobile UI trigger
     * Filter viewport/UIKit Size 768 points displays for ipads
     */
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth < 768
    ) {
      this.isMobile = true;
    }
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth > 767
    ) {
      this.isTab = true;
    }
  }
  toggleExpandRow(row) {
    this.table.rowDetail.toggleExpandRow(row);
  }
  onDetailToggle(event) {}
  onResize() {
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth < 768
    ) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }

    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth > 767
    ) {
      this.isTab = true;
    } else {
      this.isTab = false;
    }
  }
//Quick edit section
  saveQuickEdit(row, rowIndex) {
    if(row.Name == '') {
      return this.loggerService.showErrorMessage('Name cannot be empty!.');
    }
    this.deviceService.getDeviceDetails(row.MID).subscribe(result => {
      if(result != null) {
        let updatedDevice = {};
        updatedDevice['MID'] = result.MID;
        updatedDevice['TemplateId'] = result.TemplateId;
        updatedDevice['Name'] = row.Name;
        updatedDevice['Description'] = result.Description;
        this.deviceService.updateDevice(updatedDevice).subscribe(
          response => {
            if(response != null) {
              this.isEditable[rowIndex] = !this.isEditable[rowIndex];
              this.updateDeviceDetailsOnIndexedDb(result.MID, row.Name);
              return this.loggerService.showSuccessfulMessage('Device updated successully!.');
            }            
          }
        );
      }
    });
  }

  //Update relevant device on index db
  updateDeviceDetailsOnIndexedDb(MID, updatedName) {
    this.dbService.count('devices').subscribe((recordCount) => {
      if(recordCount > 0) {
        this.dbService.getAll('devices').subscribe((devices) => {
          if(devices.length > 0) {
            let updateItem = devices[0].Value.find(item => item.MID === MID);
            let index = devices[0].Value.indexOf(updateItem);
            devices[0].Value[index]['Name'] = updatedName;

            this.dbService.delete('devices', 2);
            this.dbService        .add('devices', {
                Id: 2,
                Value: devices[0].Value,
              })
              .subscribe((storeData) => {
                
              });
          }
        });
      } else {
        this.refreshDeviceList();
      }
    });

  }

  cancelQuickEdit(row, rowIndex) {
    this.isEditable[rowIndex] = !this.isEditable[rowIndex];
    return this.loggerService.showSuccessfulMessage('Update cancelled!.');
  }

  ngOnInit() {
    this.route.params.subscribe((data) => {
      this.getUrlAndLoggedUser();
      this.setDeviceListView();
      this.setLastUsedFolder(data);
      this.filterBy = data['filterBy'];
      if (this.filterBy == null) {
        this.selectedFilter = this.filterOptions[0].Id;
      }
      this.TID = data['templateId'];
      this.getDevicesWithMetaData();
    });
  }
  getUrlAndLoggedUser() {
    this.currentSystemUrl = this.getBaseUrl();
    this.loggedUserEmail = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
  }

  setDeviceListView() {
    let currentViewMode = this.getDeviceListModeFromLocal();
    if (currentViewMode != null) {
      this.selectedView = currentViewMode;
      if (currentViewMode == 'compact-tb') {
        this.isCompact = true;
      } else {
        this.isCompact = false;
      }
    } else {
      this.isCompact = false;
      this.selectedView = 'default-tb';
    }
  }

  searchDevice(event) {
    if (this.filterBy == 'recent') {
      this.showRecentDevicesOnly();
    } else if (this.filterBy == 'starred') {
      this.showMyDevicesOnly();
    } else if (this.filterBy == 'found') {
      this.showFoundDevicesOnly();
    } else {
      this.devices = this.temp;
      if (this.deviceSearch != '') {
        this.devices = this.devices.filter(
          (m) =>
            !this.deviceSearch ||
            m.Name.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) >
              -1 ||
            m.MID.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) > -1
        );
      }
      this.devices = this.devices.filter((item) =>
        this.deviceStatuses.includes(item.lastDeviceStatus)
      );
      this.devices = this.sortDevices(this.devices);
    }
  }

  clearDeviceSearch() {
    this.deviceSearch = '';
    if (this.filterBy == 'recent') {
      this.showRecentDevicesOnly();
    } else if (this.filterBy == 'starred') {
      this.showMyDevicesOnly();
    } else if (this.filterBy == 'found') {
      this.showFoundDevicesOnly();
    } else {
      this.devices = this.temp;
      this.devices = this.devices.filter((item) =>
        this.deviceStatuses.includes(item.lastDeviceStatus)
      );
      this.devices = this.sortDevices(this.devices);
    }
  }

  onValChange(value) {
    this.updateDeviceListModeOnLocal(value);
    this.selectedView = value;
    if (value == 'compact-tb') {
      this.isCompact = true;
    } else {
      this.isCompact = false;
    }
  }

  updateDeviceListModeOnLocal(viewMode) {
    localStorage.setItem(
      LocalStorageKeys.DEVICE_LIST_VIEW_MODE,
      JSON.stringify(viewMode)
    );
  }

  getDeviceListModeFromLocal() {
    return JSON.parse(
      localStorage.getItem(LocalStorageKeys.DEVICE_LIST_VIEW_MODE)
    );
  }

  setLastUsedFolder(params) {
    if (params['templateId']) {
      this.currentSelectedFolder = params['templateId'];
    } else if (params['filterBy']) {
      this.currentSelectedFolder = params['filterBy'];
    } else {
      this.currentSelectedFolder = 'All';
    }
    localStorage.setItem(
      LocalStorageKeys.LAST_FOLDER,
      JSON.stringify(this.currentSelectedFolder)
    );
  }

  devicesFilteredByStatus(data) {
    this.deviceStatuses = data;
    this.devices = this.temp;
    this.devices = this.devices.filter((item) =>
      this.deviceStatuses.includes(item.lastDeviceStatus)
    );
  }

  onDeviceFilterColorChange(ob) {
    this.devices = this.temp;
    this.deviceStatuses = ob.value;
    this.siteSetting.deviceStatusFilter.setValue(ob.value);

    switch (this.filterBy) {
      case 'recent':
        this.showRecentDevicesOnly();
        break;
      case 'starred':
        this.showMyDevicesOnly();
        break;
      case 'found':
        this.showFoundDevicesOnly();
        break;
      default:
        this.devices = this.devices.filter((item) =>
          this.deviceStatuses.includes(item.lastDeviceStatus)
        );
        this.devices = this.sortDevices(this.devices);
    }
  }

  onFilterByChange(event) {
    let selectedValue = event.value;
    if (selectedValue == '1') {
      this.router.navigateByUrl('/devices/all');
    } else if (selectedValue == '2') {
      this.router.navigateByUrl('/devices/filter/recent');
    } else {
      this.router.navigateByUrl('/devices/filter/starred');
    }
  }

  filterDeviceByRecentOrFavoriteOrFound() {
    if (this.filterBy == 'recent') {
      this.selectedFilter = this.filterOptions[1].Id;
      this.showRecentDevicesOnly();
    }
    if (this.filterBy == 'starred') {
      this.selectedFilter = this.filterOptions[2].Id;
      this.showMyDevicesOnly();
    }
    if (this.filterBy == 'found') {
      this.selectedFilter = this.filterOptions[2].Id;
      if (typeof this.searchedText === 'undefined') {
        this.showFoundDevicesOnly();
      }
    }
  }
  getBaseUrl() {
    const parsedUrl = new URL(window.location.href);
    const baseUrl = parsedUrl.origin;
    return baseUrl;
  }

  handleFavorite(MID, selection, templateId) {
    if (!selection) {
      this.isDeviceFavorite = true;
    } else {
      this.isDeviceFavorite = false;
    }
    this.cache.handleFavoriteDevices(MID, !selection, templateId);
    this.getDevicesWithMetaData();
    this.menuUpdateService.getMenuUpdatedValue(true);
  }

  showRecentDevicesOnly() {
    let filteredDevice = [];
    this.devices = this.temp;
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey = url + '-' + userName + 'recent';
    let storedRecentDevices = JSON.parse(localStorage.getItem(localStorageKey));

    if (storedRecentDevices != null) {
      storedRecentDevices.forEach((recent) => {
        this.devices.forEach((device) => {
          if (recent.MID == device.MID) {
            device['Order'] = recent.Order;
            filteredDevice.push(device);
          }
        });
      });
    }
    if(this.TID != null) {
      filteredDevice = filteredDevice.filter(d => d.TemplateId == this.TID)
    }
    //if(filteredDevice.length > 0) {
    filteredDevice.sort(function (a, b) {
      return b.Order - a.Order;
    });
    if (this.deviceStatuses.length < 4) {
      filteredDevice = filteredDevice.filter((item) =>
        this.deviceStatuses.includes(item.lastDeviceStatus)
      );
    }

    this.devices = filteredDevice;
    if (this.deviceSearch != '') {
      this.devices = this.devices.filter(
        (m) =>
          !this.deviceSearch ||
          m.Name.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) > -1 ||
          m.MID.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) > -1
      );
    }
    //}
  }

  showMyDevicesOnly() {
    let filteredDevice = [];
    this.devices = this.temp;
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey = url + '-' + userName + 'favorite';
    let myDevices = JSON.parse(localStorage.getItem(localStorageKey));
    if (myDevices != null) {
      filteredDevice = this.devices.filter((element) =>
        myDevices.some((item) => item.MID == element.MID)
      );
    }
    if(this.TID != null) {
      filteredDevice = filteredDevice.filter(d => d.TemplateId == this.TID)
    }
    //if(filteredDevice.length > 0) {
    filteredDevice.sort((a, b) => (a.MID > b.MID ? 1 : b.MID > a.MID ? -1 : 0));
    if (this.deviceStatuses.length < 4) {
      filteredDevice = filteredDevice.filter((item) =>
        this.deviceStatuses.includes(item.lastDeviceStatus)
      );
    }

    this.devices = filteredDevice;
    if (this.deviceSearch != '') {
      this.devices = this.devices.filter(
        (m) =>
          !this.deviceSearch ||
          m.Name.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) > -1 ||
          m.MID.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) > -1
      );
    }
    //}
  }

  showFoundDevicesOnly() {
    let filteredDevice = [];
    this.devices = this.temp;
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey =
      url + '_' + userName + '_' + LocalStorageKeys.SEARCH_QUERY;
    //let foundDevices = JSON.parse(localStorage.getItem(localStorageKey));
    let searchQuery = JSON.parse(localStorage.getItem(localStorageKey));

    if (searchQuery != null) {
      filteredDevice = this.devices.filter(
        (m) =>
          !searchQuery ||
          m.Name.toLowerCase().indexOf(searchQuery.toLowerCase()) > -1 ||
          m.MID.toLowerCase().indexOf(searchQuery.toLowerCase()) > -1
      );
    }

    //if(filteredDevice.length > 0) {
    filteredDevice.sort((a, b) => (a.MID > b.MID ? 1 : b.MID > a.MID ? -1 : 0));

    if(this.TID != null) {
      filteredDevice = filteredDevice.filter(d => d.TemplateId == this.TID)
    }

    if (this.deviceStatuses.length < 4) {
      filteredDevice = filteredDevice.filter((item) =>
        this.deviceStatuses.includes(item.lastDeviceStatus)
      );
    }

    this.devices = filteredDevice;
    if (this.deviceSearch != '') {
      this.devices = this.devices.filter(
        (m) =>
          !this.deviceSearch ||
          m.Name.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) > -1 ||
          m.MID.toLowerCase().indexOf(this.deviceSearch.toLowerCase()) > -1
      );
    }
  }

  getDevicesWithMetaData() {
    //Get devices from IDB
    let allDevices = null;
    this.dbService.count('devices').subscribe((recordCount) => {
      if (recordCount == 0) {
        this.deviceService
          .getDeviceDetailsAsCSV('false', 'true') //.getDeviceMetaAndDeviceData('false', 'true')
          .subscribe((devices) => {
            let deviceList = [];
            let templateList = [];
            let templateName;
            let totalTemplateDeviceCount;
            let values = devices.split('\n');
            values.pop();
            var valueLength = values.length;
            let totalCount = {};
            totalCount['TemplateName'] = 'All Devices';
            totalCount['DeviceCount'] = valueLength;
            templateList.push(totalCount);
            for (
              let templateIdx = 0;
              templateIdx < valueLength;
              templateIdx++
            ) {
              let element = values[templateIdx].split(';');

              let temp = {};
              temp['TemplateName'] = element[0];
              temp['DeviceCount'] = parseInt(
                element[1].replace(/(\r\n|\n|\r)/gm, '')
              );

              templateList.push(temp);

              templateName = element[0];
              totalTemplateDeviceCount = element[1];

              let deviceIdx = templateIdx + 1;
              let deviceIterator =
                templateIdx + parseInt(totalTemplateDeviceCount);
              for (let id = deviceIdx; id <= deviceIterator; id++) {
                let deviceElement = values[id].split(';');
                let dev = {};
                dev['TemplateId'] = templateName;
                dev['MID'] = deviceElement[0];
                dev['Name'] = deviceElement[1];
                dev['LatestPulse'] = deviceElement[2].replace(
                  /(\r\n|\n|\r)/gm,
                  ''
                );
                deviceList.push(dev);
                deviceIdx++;
              }

              templateIdx += parseInt(totalTemplateDeviceCount);
            }
            localStorage.setItem(
              'TemplateDeviceCount',
              JSON.stringify(templateList)
            );
            this.dbService
              .add('devices', {
                Id: 2,
                Value: deviceList,
              })
              .subscribe((storeData) => {
                this.menuUpdateService.getMenuUpdatedValue(true);
              });
            if (deviceList.length > 0) {
              allDevices = this.arrangeDeviceListNew(deviceList);
              this.updateDeviceList(allDevices);
              if (this.TID != 'undefined' && this.TID != null) {
                this.createDeviceList(allDevices);
              }
              if (this.filterBy != null && this.filterBy != null) {
                this.filterDeviceByRecentOrFavoriteOrFound();
              }
            }
          });
      } else {
        this.dbService.getAll('devices').subscribe((devices) => {
          if (devices[0].Value != null) {
            let allDevicesList = devices[0].Value;
            if (this.TID != 'undefined' && this.TID != null) {
              allDevicesList = allDevicesList.filter(
                (d) => d.TemplateId == this.TID
              );
              allDevicesList = this.arrangeDeviceListNew(allDevicesList);
              this.createDeviceList(allDevicesList);
            } else {
              allDevicesList = this.arrangeDeviceListNew(allDevicesList);
            }
            this.updateDeviceList(allDevicesList);
            if (this.filterBy != null) {
              this.filterDeviceByRecentOrFavoriteOrFound();
            }
            allDevices = allDevicesList;
            
          }
        });
      }
      this.temp = allDevices;
    });
    this.updateTemplateLocalStorage();
  }

  /**
   *
   */
  arrangeDeviceListNew(devices) {
    devices.forEach((device) => {
      let deviceFavorite = this.checkDeviceFavoriteStatus(device.MID);
      device['isDeviceFavorite'] = deviceFavorite;
      if (device.LatestPulse != null) {
        let pulseColor = this.getDeviceStatusNew(device.LatestPulse);
        device['lastDeviceStatus'] = pulseColor;
        if (pulseColor == DeviceActivityColors.GREEN) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: less than 2 hours ago';
        } else if (pulseColor == DeviceActivityColors.AMBER) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: between 2 and 24 hours ago';
        } else if (pulseColor == DeviceActivityColors.RED) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: more than 1 day ago';
        } else {
          device['lastDevicePulseTime'] = 'Last Device Pulse: never';
        }
        return device;
      } else {
        device['lastDeviceStatus'] = this.getDeviceStatusNew();
        device['lastDevicePulseTime'] = 'Last Device Pulse: never';
        return device;
      }
    });
    return devices;
  }
  getDeviceStatusNew(pulseHours = null) {
    let color = DeviceActivityColors.GRAY;

    if (pulseHours != null) {
      if (pulseHours > 24) {
        color = DeviceActivityColors.RED;
      } else if (pulseHours == '') {
        color = DeviceActivityColors.GRAY;
      } else if (pulseHours <= 2) {
        color = DeviceActivityColors.GREEN;
      } else if (pulseHours > 2 && pulseHours <= 24) {
        color = DeviceActivityColors.AMBER;
      } else {
        color = DeviceActivityColors.GRAY;
      }
    }
    return color;
  }

  createDeviceList(allDevices) {
    this.temp = allDevices.filter((e) => !this.TID || e.TemplateId == this.TID);
    this.syncTime = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LAST_SYNC_DEVICE_LIST)
    );
    this.lastSyncTime = this.syncTime - new Date().getTime();
    this.lastSyncTime = this.formatTimeDuration(this.lastSyncTime);
    if (!isNullOrUndefined(this.searchService.search)) {
      this.filterDevices((this.lastDevice = this.searchService.search));
    } else {
      this.updateGlobalSearch(this.lastDevice);
    }
  }

  /**
   * Update showDeviceActivity status to setting service.If not status is pased, current status is used
   * @param value
   */
  onShowActiveDevices(value: boolean = null): void {
    this.siteSetting.showActiveDevices.setValue(
      (this.showActiveDevices = !isNullOrUndefined(value)
        ? value
        : this.showActiveDevices)
    );
  }
  /**
   * Update local storage for cached devices
   */
  updateDeviceList(devices) {
    localStorage.setItem(
      LocalStorageKeys.LAST_SYNC_DEVICE_LIST,
      JSON.stringify(new Date().getTime())
    );
    //this.updateIDBWithDevices(devices);
    this.temp = devices;
    if (!isNullOrUndefined(this.searchService.search)) {
      this.filterDevices((this.lastDevice = this.searchedText));
    } else {
      this.updateGlobalSearch(this.lastDevice);
    }
  }

  updateIDBWithDevices(devices) {
    this.dbService.count('devices').subscribe((recordCount) => {
      if (recordCount == 0) {
        this.dbService
          .add('devices', {
            Value: devices,
          })
          .subscribe((storeData) => {
            //console.log('Inserted Devices List to IDB');
          });
      }
    });
  }

  getDevicesFromIDB() {
    let allDevices = null;
    this.dbService.getByKey('devices', 1).subscribe((devices) => {
      if (devices.Value != null) {
        allDevices = this.arrangeDeviceList(
          this.getDetailDeviceList(devices.Value)
        );
      }
    });
    return allDevices;
  }

  private getDetailDeviceList(devices: any) {
    let deviceList = [];
    devices.forEach((element) => {
      var item = {
        MID: element.M,
        Name: element.N,
        TemplateId: element.T,
        Description: element.D,
        LatestPulse: element.P,
      };
      deviceList.push(item);
    });
    return deviceList;
  }

  private arrangeDeviceList(devices) {
    devices.forEach((device, deviceIndex) => {
      let deviceFavorite = this.checkDeviceFavoriteStatus(device.MID);
      device['isDeviceFavorite'] = deviceFavorite;
      if (device.LatestPulse != null) {
        let pulseColor = this.getDeviceStatus(device.LatestPulse);
        device['lastDeviceStatus'] = pulseColor;
        if (pulseColor == DeviceActivityColors.GREEN) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: less than 2 hours ago';
        } else if (pulseColor == DeviceActivityColors.AMBER) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: between 2 and 24 hours ago';
        } else if (pulseColor == DeviceActivityColors.RED) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: more than 1 day ago';
        } else {
          device['lastDevicePulseTime'] = 'Last Device Pulse: never';
        }
        return device;
      } else {
        device['lastDeviceStatus'] = this.getDeviceStatus();
        device['lastDevicePulseTime'] = 'Last Device Pulse: never';
        return device;
      }
    });
    return devices;
  }

  checkDeviceFavoriteStatus(deviceMid) {
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey = url + '-' + userName + 'favorite';
    let starredDevices = JSON.parse(localStorage.getItem(localStorageKey));

    let deviceFavoriteStatus = false;
    if (starredDevices != null) {
      starredDevices.forEach((starrDevice) => {
        if (starrDevice.MID == deviceMid) {
          deviceFavoriteStatus = true;
        }
      });
    }
    return deviceFavoriteStatus;
  }

  private getDeviceStatus(pulseTime = null) {
    let color = DeviceActivityColors.GRAY;

    if (pulseTime != null) {
      var timeDiffMilliseconds =
        new Date().getTime() - new Date(pulseTime).getTime();

      var diffHours = Math.round(timeDiffMilliseconds / (1000 * 3600));
      var diffDays = Math.round(diffHours / 24);

      if (diffDays > 1) {
        color = DeviceActivityColors.RED;
      } else if (diffHours <= 2) {
        color = DeviceActivityColors.GREEN;
      } else if (diffHours > 2 && diffDays <= 1) {
        color = DeviceActivityColors.AMBER;
      } else {
        //console.log(pulseTime);
      }
    }
    return color;
  }

  updateTemplateLocalStorage(): void {
    var cachedTemplates = JSON.parse(
      localStorage.getItem(LocalStorageKeys.CACHED_TEMPLATES)
    );
    if (cachedTemplates == null) {
      this.templateService.getTemplates().subscribe((data) => {
        localStorage.setItem(
          LocalStorageKeys.CACHED_TEMPLATES,
          JSON.stringify(data)
        );
      });
    }
  }

  /**
   * Format time difference
   * @param ts
   */
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
  /**
   * Clones the array and group sorts by {1: TemplateId, {2:MID}} in ascending order.
   * @param souce The array to sort.
   */
  sortDevices(souce: any[]): any[] {
    souce = souce == null ? [] : souce;

    return souce
      .slice()
      .sort(
        (a, b) =>
          a.TemplateId.localeCompare(b.TemplateId) || a.MID.localeCompare(b.MID)
      );
  }

  /**
   * Filters devices listing by search criteria.
   * @param event input change event containing the search text and keycode.
   */
  updateGlobalSearch(event) {
    let query;
    if (event) {
      query = event; //event.target.value;
    }
    if (this.searchedText != null) {
      query = this.searchedText;
    }
    this.filterDevices(query);
    // if (event && event.keyCode == 13 && this.devices.length == 1) {
    //   setTimeout(() => {
    //     this.router.navigateByUrl('devices/general/' + this.devices[0].MID);
    //   }, 600);
    // }
  }

  filterDevices(query: string): void {
    this.isLoading = true;
    if (typeof query !== 'undefined') {
      query = query.trim();
    }

    let filteredDevices = [];
    this.devices = this.sortDevices(this.temp).filter(
      (m) =>
        !query ||
        m.Name.toLowerCase().indexOf(query.toLowerCase()) > -1 ||
        m.MID.toLowerCase().indexOf(query.toLowerCase()) > -1
    );    

    if (typeof query !== 'undefined') {      
      if (query.length > 0) {
        filteredDevices = this.devices.map(function(device) {
          let data = {};
          data['MID'] = device.MID;
          data['TID'] = device.TemplateId;
          return data;
        });
    
        let commonKey = this.currentSystemUrl + '_' + this.loggedUserEmail;
        localStorage.removeItem(commonKey + '_' + LocalStorageKeys.FOUND_DEVICE_LIST);
        localStorage.setItem(
          commonKey + '_' + LocalStorageKeys.FOUND_DEVICE_LIST,
          JSON.stringify(filteredDevices)
        );
        this.updateSearchResultCountAndMenuUpdate(query);
      }
    }

    if (this.showActiveDevices) {
      this.devices = this.devices.filter(
        (m) =>
          m.lastDeviceStatus.toLowerCase() ==
            DeviceActivityColors.GREEN.toLowerCase() ||
          m.lastDeviceStatus.toLowerCase() ==
            DeviceActivityColors.AMBER.toLowerCase()
      );
    }
    this.devices = this.devices.filter((item) =>
      this.deviceStatuses.includes(item.lastDeviceStatus)
    );

    this.currentPage = 0;
    this.isLoading = false;
  }

  updateSearchResultCountAndMenuUpdate(query) {
    let commonKey = this.currentSystemUrl + '_' + this.loggedUserEmail;
    localStorage.removeItem(commonKey + '_' + LocalStorageKeys.SEARCH_COUNT);
    localStorage.setItem(
      commonKey + '_' + LocalStorageKeys.SEARCH_COUNT,
      JSON.stringify(this.devices.length)
    );
    this.menuUpdateService.getMenuUpdatedValue(true);
    this.handleFoundDevices(query);
  }

  handleFoundDevices(query) {
    let commonKey = this.currentSystemUrl + '_' + this.loggedUserEmail;
    let localStorageKey = commonKey + '_' + LocalStorageKeys.SEARCH_QUERY;
    localStorage.removeItem(localStorageKey);
    localStorage.setItem(localStorageKey, JSON.stringify(query));
  }

  onChange(event: any): void {
    this.currentPage = event.offset;
  }

  navigate() {
    this.router.navigateByUrl('devices/create');
  }

  navigateToDetails(mid) {
    this.searchedText = '';
    this.router.navigateByUrl('devices/general/' + mid);
  }

  showActiveDevicesOnly() {
    this.ngOnInit();
  }

  refreshDeviceListOld() {
    let allDevices = null;
    this.dbService.clear('devices').subscribe((devices) => {
      localStorage.removeItem(LocalStorageKeys.CACHED_TEMPLATES);
      this.deviceService
        .getDeviceDetailsAsCSV('false', 'true', '2021-09-01')
        .subscribe((devices) => {
          this.dbService
            .add('devices', {
              Id: 2,
              Value: devices,
            })
            .subscribe((storeData) => {
              this.dbService.getAll('devices').subscribe((devices) => {
                if (devices[0].Value != null) {
                  allDevices = this.arrangeDeviceList(devices[0].Value);
                  this.updateDeviceList(allDevices);
                  if (this.TID != 'undefined' && this.TID != null) {
                    this.createDeviceList(allDevices);
                  }
                  this.updateTemplateLocalStorage();
                }
              });
            });
        });
    });
    if (this.appSettings.api_version == '5') {
      this.updateUserPermission();
    }
  }

  refreshDeviceList() {
    let devicesLastUpdatedOn = localStorage.getItem(
      LocalStorageKeys.DEVICES_LAST_UPDATED_ON
    );
    var currentUTC = moment.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
    localStorage.setItem(LocalStorageKeys.DEVICES_LAST_UPDATED_ON, currentUTC);
    if (devicesLastUpdatedOn == null) {
      devicesLastUpdatedOn = currentUTC;
    }
    let time = performance.now();
    this.deviceService
      .getDeviceDetailsAsCSV('false', 'true') //devicesLastUpdatedOn
      .subscribe((devices) => {
        if (devices.length > 0) {
          let latestDevices = this.arrangeLatestDeviceList(devices);
          this.updateDeviceStorage(latestDevices); //updateExistingDeviceWithLatest - delta api
        }
        // console.log(
        //   `Put operations done. Took ${Math.round(
        //     performance.now() - time
        //   )} milliseconds.`
        // );
      });
    if (this.appSettings.api_version == '5') {
      this.updateUserPermission();
    }
  }

  updateDeviceStorage(latestDevices) {
    let allDevices = null;
    this.dbService.clear('devices').subscribe((devices) => {
      allDevices = this.arrangeDeviceListNew(latestDevices);
      this.updateDeviceList(allDevices);
      if (this.TID != 'undefined' && this.TID != null) {
        this.createDeviceList(allDevices);
      }
      this.updateTemplateLocalStorage();
      this.dbService.delete('devices', 2);
      this.dbService
        .add('devices', {
          Id: 2,
          Value: allDevices,
        })
        .subscribe((storeData) => {
          this.menuUpdateService.getMenuUpdatedValue(true);
        });
    });
    this.devices = allDevices;
  }

  arrangeLatestDeviceList(devices) {
    let deviceList = [];
    let templateList = [];
    let templateName;
    let totalTemplateDeviceCount;
    let values = devices.split('\n');
    values.pop();
    var valueLength = values.length;
    for (let templateIdx = 0; templateIdx < valueLength; templateIdx++) {
      let element = values[templateIdx].split(';');

      let temp = {};
      temp['TemplateName'] = element[0];
      temp['DeviceCount'] = parseInt(element[1].replace(/(\r\n|\n|\r)/gm, ''));

      templateList.push(temp);

      templateName = element[0];
      totalTemplateDeviceCount = element[1];

      let deviceIdx = templateIdx + 1;
      let deviceIterator = templateIdx + parseInt(totalTemplateDeviceCount);
      for (let id = deviceIdx; id <= deviceIterator; id++) {
        let deviceElement = values[id].split(';');
        let dev = {};
        dev['TemplateId'] = templateName;
        dev['MID'] = deviceElement[0];
        dev['Name'] = deviceElement[1];
        dev['LatestPulse'] = deviceElement[2].replace(/(\r\n|\n|\r)/gm, '');
        deviceList.push(dev);
        deviceIdx++;
      }

      templateIdx += parseInt(totalTemplateDeviceCount);
    }
    return deviceList;
  }

  updateExistingDeviceWithLatest(latestDevices) {
    let allDevices = null;
    let existingDevices = [];
    const seen = new Set();
    this.dbService.count('devices').subscribe((recordCount) => {
      if (recordCount > 0) {
        this.dbService.getAll('devices').subscribe((devices) => {
          existingDevices = devices[0].Value;

          allDevices = existingDevices.concat(latestDevices);
          allDevices = allDevices.filter((el) => {
            const duplicate = seen.has(el.MID);
            seen.add(el.MID);
            return !duplicate;
          });

          allDevices = this.arrangeDeviceListNew(allDevices);
          this.updateDeviceList(allDevices);
          if (this.TID != 'undefined' && this.TID != null) {
            this.createDeviceList(allDevices);
          }
          this.updateTemplateLocalStorage();
          this.dbService.delete('devices', 2);
          this.dbService
            .add('devices', {
              Id: 2,
              Value: allDevices,
            })
            .subscribe((storeData) => {
              this.menuUpdateService.getMenuUpdatedValue(true);
            });
        });
      }
      this.devices = allDevices;
    });
  }

  updateUserPermission() {
    this.userPermission.removeUserPermissionFromLocalStorage();
    this.userPermission.getUserPermission();
  }
}
