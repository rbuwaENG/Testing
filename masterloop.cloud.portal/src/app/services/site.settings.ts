// import { ReplaySubject, Subject, Subscription, Observable } from 'rxjs';
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

import { LocalStorageKeys, TrackStyles } from '../core/constants';
import { DeviceActivityColors } from '../core/constants/device-activity-colors';
import { MapType } from '../core/enums';
import { CachableNotifyingObject } from '../core/models';
import { ThemeStyles } from './../core/constants/theme-styles-constants';

@Injectable({
  providedIn: 'root',
})
export class SiteSetting {
  public mapType: CachableNotifyingObject<MapType>;
  public reduceMapPoints: CachableNotifyingObject<boolean>;
  public showActiveDevices: CachableNotifyingObject<boolean>;
  public selectedTemplates: CachableNotifyingObject<any>;
  public changeTemplateSelection: CachableNotifyingObject<boolean>;
  public selectAllTemplates: CachableNotifyingObject<boolean>;
  public trackStyle: CachableNotifyingObject<any>;
  public deviceStatusFilter: CachableNotifyingObject<any>;
  public themeType: CachableNotifyingObject<string>;

  private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.mapType = new CachableNotifyingObject<MapType>(
      LocalStorageKeys.SELECTED_MAP_TYPE
    );
    this.mapType.getValue() || this.mapType.setValue(MapType.Standard);

    this.reduceMapPoints = new CachableNotifyingObject<boolean>(
      LocalStorageKeys.SIMPLIFY_ENABLED
    );
    this.reduceMapPoints.getValue() || this.reduceMapPoints.setValue(false);

    this.showActiveDevices = new CachableNotifyingObject<boolean>(
      LocalStorageKeys.SHOW_ACTIVE_DEVICES
    );
    this.showActiveDevices.getValue() || this.showActiveDevices.setValue(false);

    this.selectedTemplates = new CachableNotifyingObject<any>(
      LocalStorageKeys.SELECTED_TEMPLATES
    );
    this.selectedTemplates.getValue() || this.selectedTemplates.setValue([]);

    this.changeTemplateSelection = new CachableNotifyingObject<boolean>(
      LocalStorageKeys.CHANGE_TEMPLATE_SELECTION
    );
    this.changeTemplateSelection.getValue() ||
      this.changeTemplateSelection.setValue(false);

    this.selectAllTemplates = new CachableNotifyingObject<boolean>(
      LocalStorageKeys.SELECT_ALL_TEMPLATES
    );
    this.selectAllTemplates.getValue() ||
      this.selectAllTemplates.setValue(false);

    this.trackStyle = new CachableNotifyingObject<any>(
      LocalStorageKeys.TRACK_STYLE
    );
    this.trackStyle.getValue() ||
      this.trackStyle.setValue(TrackStyles.trackStyles[0]);

    this.deviceStatusFilter = new CachableNotifyingObject<any>(
      LocalStorageKeys.DEVICE_STATUS_FILTER
    );
    let deviceStatuses = [
      DeviceActivityColors.GREEN,
      DeviceActivityColors.AMBER,
      DeviceActivityColors.RED,
      DeviceActivityColors.GRAY,
    ];
    this.deviceStatusFilter.getValue() ||
      this.deviceStatusFilter.setValue(deviceStatuses);

    this.renderer = rendererFactory.createRenderer(null, null);
    this.themeType = new CachableNotifyingObject<string>(
      LocalStorageKeys.COLOR_THEME
    );
    // Set default theme value if getting current theme value causes error.
    try {
      this.themeType.getValue() || this.themeType.setValue(ThemeStyles.lightMode);
    } catch (error) {
      this.themeType.setValue(ThemeStyles.lightMode);
    }

    this.themeType.valueChanges.subscribe(theme => {
      let previousColorTheme = (theme === ThemeStyles.darkMode) ? ThemeStyles.lightMode : ThemeStyles.darkMode;
      this.renderer.removeClass(document.body, previousColorTheme);
      this.renderer.addClass(document.body, theme);
    });
  }

  /**
   * Clear all localstorage values
   */
  public clearAll() {
    localStorage.clear();
  }

  public clearSelectedLocalStorageKeys() {
    this.clearFoundDevices();
    localStorage.removeItem(LocalStorageKeys.USER_INFO);
    localStorage.removeItem(LocalStorageKeys.LOGIN_USER);
    localStorage.removeItem(LocalStorageKeys.DEVICE_LIST_VIEW_MODE);
    localStorage.removeItem(LocalStorageKeys.DEVICES_LAST_UPDATED_ON);
  }

  private clearFoundDevices() {
    let url = this.getBaseUrl();
    let userName = JSON.parse(
      localStorage.getItem(LocalStorageKeys.LOGIN_USER)
    );
    let localStorageKey =
      url + '_' + userName + '_' + LocalStorageKeys.FOUND_DEVICES;
    localStorage.removeItem(localStorageKey);
  }

  private getBaseUrl() {
    const parsedUrl = new URL(window.location.href);
    const baseUrl = parsedUrl.origin;
    return baseUrl;
  }

  /**
 * Theme related functions
 */
  initTheme() {
    this.renderer.addClass(document.body, this.themeType.getValue());
  }

}
