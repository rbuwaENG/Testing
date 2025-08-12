import { Injectable } from '@angular/core';
import { LocalStorageKeys } from '../core/constants';
import { DeviceActivityColors } from '../core/constants/device-activity-colors';
import { MenuUpdateService } from './menu-update.service';
import { EnumerationGroupDetails } from '../core/interfaces/template-enumeration.interface';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  devices: any;

  constructor(private menuUpdateService: MenuUpdateService) {}

  ngOnInit() {}

  handleFavoriteDevices(MID, selection, templateId) {
    let devices = [];
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey = url + '-' + userName + 'favorite';
    let favoriteDevices = JSON.parse(localStorage.getItem(localStorageKey));
    if (favoriteDevices == null) {
      let device = {};
      device['MID'] = MID;
      device['TemplateId'] = templateId;
      devices.push(device);
      localStorage.setItem(localStorageKey, JSON.stringify(devices));
    } else {
      if (favoriteDevices.length > 0) {
        favoriteDevices.forEach((device) => {
          devices.push(device);
        });
        let index = devices.findIndex((device) => device['MID'] == MID);
        if (selection) {
          if (index == -1) {
            let device = {};
            device['MID'] = MID;
            device['TemplateId'] = templateId;
            devices.push(device);

            localStorage.setItem(localStorageKey, JSON.stringify(devices));
          }
        } else {
          if (index != -1) {
            devices.splice(index, 1);
            localStorage.setItem(localStorageKey, JSON.stringify(devices));
          }
        }
      } else {
        let device = {};
        device['MID'] = MID;
        device['TemplateId'] = templateId;
        devices.push(device);

        localStorage.setItem(localStorageKey, JSON.stringify(devices));
      }
    }
  }

  getBaseUrl() {
    // Needed on Angular 8+
    const parsedUrl = new URL(window.location.href);
    const baseUrl = parsedUrl.origin;
    //console.log(baseUrl);
    return baseUrl;
  }

  private menuNeedsToBeUpdated() {
    this.menuUpdateService.getMenuUpdatedValue(true);
  }

  updateRecentDevices(viewedDevice, templateId) {
    let devices = [];
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey = url + '-' + userName + 'recent';
    let localDevices = JSON.parse(localStorage.getItem(localStorageKey));
    if (localDevices == null) {
      let device = {};
      device['MID'] = viewedDevice;
      device['TemplateId'] = templateId;
      device['Order'] = 1;
      devices.push(device);
      localStorage.setItem(localStorageKey, JSON.stringify(devices));
    } else {
      if (localDevices.length > 0) {
        localDevices.forEach((device) => {
          devices.push(device);
        });
        devices.sort(function (a, b) {
          return b.Order - a.Order;
        });

        if (devices.length != 50) {
          let MIDExist = devices.findIndex(
            (device) => device['MID'] == viewedDevice
          );
          if (MIDExist == -1) {
            let latestRecentDevice = devices[0];
            let device = {};
            device['MID'] = viewedDevice;
            device['TemplateId'] = templateId;
            device['Order'] = latestRecentDevice['Order'] + 1;
            devices.push(device);
            localStorage.setItem(localStorageKey, JSON.stringify(devices));
          } else {
            let latestRecentDevice = devices[0];
            let updatedDevice = {};
            updatedDevice['MID'] = viewedDevice;
            updatedDevice['TemplateId'] = templateId;
            updatedDevice['Order'] = latestRecentDevice['Order'] + 1;
            devices.splice(MIDExist, 1);
            devices.push(updatedDevice);
            localStorage.setItem(localStorageKey, JSON.stringify(devices));
          }
        } else {
          devices.pop();
          let MIDExist = devices.findIndex(
            (device) => device['MID'] == viewedDevice
          );
          if (MIDExist == -1) {
            let latestRecentDevice = devices[0];
            let device = {};
            device['MID'] = viewedDevice;
            device['TemplateId'] = templateId;
            device['Order'] = latestRecentDevice['Order'] + 1;
            devices.push(device);
            localStorage.setItem(localStorageKey, JSON.stringify(devices));
          }
        }
      }
    }
    this.menuNeedsToBeUpdated();
  }

  updateDevice(data: any): void {
    let devices = [];
    let currentDevice = { Device: data };
    let localDevices = JSON.parse(this.getAllDeviceDetails());
    if (localDevices != null) {
      localDevices.forEach((device) => {
        devices.push(device);
      });
    }
    devices.push(currentDevice);
    sessionStorage.setItem(
      LocalStorageKeys.DEVICE_DETAILS,
      JSON.stringify(devices)
    );
  }

  getDevice(mid: string): any {
    let device = null;
    let localDevices = JSON.parse(this.getAllDeviceDetails());
    if (localDevices != null) {
      for (let item of localDevices) {
        if (item.Device.MID === mid) {
          device = item.Device;
          break;
        }
      }
    }
    return device;
  }

  removeAllDevices(): void {
    sessionStorage.removeItem(LocalStorageKeys.DEVICE_DETAILS);
  }

  removeSessionStorageDeviceByMid(mid: string) {
    let devices = [];
    let allDevices = JSON.parse(this.getAllDeviceDetails());
    if (allDevices != null) {
      for (let item of allDevices) {
        if (item.Device.MID !== mid) {
          devices.push(item);
        }
      }
    }
    sessionStorage.setItem(
      LocalStorageKeys.DEVICE_DETAILS,
      JSON.stringify(devices)
    );
  }

  removeLocalStorageDeviceByMid(mid: string) {
    let devices = [];
    let cachedDevices = this.getAllDevices();
    if (cachedDevices != null) {
      for (let item of cachedDevices) {
        if (item.MID !== mid) {
          devices.push(item);
        }
      }
    }
    this.updateDeviceListLocalStorage(devices);
  }

  createDeviceLocalStorage(devices: any) {
    this.updateDeviceListLocalStorage(devices);
  }

  // minified the property names to the single character
  private getMinifiedDeviceList(devices: any) {
    let deviceList = [];
    devices.forEach((element) => {
      let item = {
        M: element.MID,
        N: element.Name,
        T: element.TemplateId,
        D: element.Description,
        P: element.LatestPulse,
      };
      deviceList.push(item);
    });
    return deviceList;
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

  private updateDeviceListLocalStorage(deviceList: any) {
    try {
      let minified = this.getMinifiedDeviceList(deviceList);
      let compressed = this.compressData(minified);
      localStorage.setItem(
        LocalStorageKeys.CACHED_DEVICES,
        JSON.stringify(compressed)
      );
      console.log('Local storage was updated');
    } catch (err) {
      //store to the varibale and set local storage to null
      localStorage.removeItem(LocalStorageKeys.CACHED_DEVICES);
      this.devices = this.arrangeDeviceList(deviceList);
      console.log('Local storage was exceeded');
    }
  }

  //get all devices from local storage or variable
  getAllDevices(): any {
    let devices = null;
    let cachedDevices = this.decompressData(
      localStorage.getItem(LocalStorageKeys.CACHED_DEVICES)
    );
    if (cachedDevices != null) {
      devices = this.arrangeDeviceList(this.getDetailDeviceList(cachedDevices));
    } else {
      if (this.devices != null) {
        devices = this.devices;
      }
    }
    return devices;
  }

  clearDeviceListCache() {
    localStorage.removeItem(LocalStorageKeys.CACHED_DEVICES);
    this.devices = null;
  }

  setQuantities(quantities: any) {
    localStorage.setItem(
      LocalStorageKeys.QUANTITIES,
      JSON.stringify(quantities)
    );
  }

  getQuantities(): any {
    return JSON.parse(localStorage.getItem(LocalStorageKeys.QUANTITIES));
  }

  // set the pulze updated time based on LatestPulse
  private arrangeDeviceList(devices) {
    devices.forEach((device, deviceIndex) => {
      if (device.LatestPulse != null) {
        // return device['lastDeviceStatus'] = this.getDeviceStatus(device.LatestPulse);
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
        // return device['lastDeviceStatus'] = this.getDeviceStatus();
        device['lastDeviceStatus'] = this.getDeviceStatus();
        device['lastDevicePulseTime'] = 'Last Device Pulse: never';
        return device;
      }
    });
    return devices;
  }

  // get the device status based on the pulse time
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
        console.log(pulseTime);
      }
    }
    return color;
  }

  private getAllDeviceDetails(): any {
    return sessionStorage.getItem(LocalStorageKeys.DEVICE_DETAILS);
  }

  // compress and decompress data using "compressed-json" angular library
  private compressData(object: any) {
    var cjson = require('compressed-json');
    var compressed = cjson.compress(object);
    return compressed;
  }

  private decompressData(text: any) {
    var cjson = require('compressed-json');
    const restored = cjson.decompress(JSON.parse(text));
    return restored;
  }

  getDeviceObservations(mid: string): any[] {
    let device =  this.getDevice(mid);
    if (device != null) {
      return device['Metadata']['Observations'].sort(
        function (a, b) {
          return parseFloat(a.Id) - parseFloat(b.Id);
        }
      );
    }
    return [];
  }

  getDeviceEnumerations(mid: string): EnumerationGroupDetails[] {
    let device =  this.getDevice(mid);
    if (device != null && device['Metadata']['EnumerationGroups']) {
      return device['Metadata'][
        'EnumerationGroups'
      ]?.sort(function (a, b) {
        return parseFloat(a.Id) - parseFloat(b.Id);
      });
    }
    return [];
  }

  setColorTheme(theme: string) {
    localStorage.setItem(
      LocalStorageKeys.COLOR_THEME,
      theme
    );
  }

  getColorTheme(): string | undefined {
    return localStorage.getItem(LocalStorageKeys.COLOR_THEME);
  }
}
