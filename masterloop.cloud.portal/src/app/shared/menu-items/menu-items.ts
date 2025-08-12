import { Injectable } from '@angular/core';
import {
  AppSettings
} from 'src/app/services';
import { userPermissionService } from 'src/app/services/user-permission.service';
import { UserService } from 'src/app/services/user.service';
import { LocalStorageKeys } from '../../core/constants';

export interface BadgeItem {
  type: string;
  value: string;
}

export interface ChildrenItems {
  state: string;
  queryParam?: any;
  name: string;
  type?: string;
  count?: any;
  selected: boolean;
}

export interface Menu {
  state: string;
  name: string;
  type: string;
  open: boolean;
  icon: string;
  badge?: BadgeItem[];
  children?: ChildrenItems[];
}

const MENUITEMS = [
  {
    state: 'devices',
    name: 'Devices',
    type: 'sub',
    icon: 'devices',
    open: true,
    children: [
      {
        state: 'all',
        name: 'All Devices',
        count: '',
        templateName: 'All',
        selected:
          localStorage.getItem(LocalStorageKeys.SELECT_ALL_TEMPLATES) == 'true',
      },
    ],
    visible: true,
  },
  {
    state: 'templates',
    name: 'Templates',
    type: 'link',
    open: false,
    icon: 'label',
    children: [],
    visible: true,
  },
  {
    state: 'analyzer',
    name: 'Analyzer',
    type: 'sub',
    open: false,
    icon: 'analytics',
    children: [
      {
        state: 'observationTable',
        name: 'Observation Table',
        count: '',
        selected: false,
      },
      {
        state: 'observationPlot',
        name: 'Observation Plot',
        count: '',
        selected: false,
      },
      { state: 'map', name: 'Observation Map', count: '', selected: false },
      {
        state: 'template-analyzer',
        name: 'Template Analyzer',
        count: '',
        selected: false,
      },
      {
        state: 'devicesPosition',
        name: 'Devices Map',
        count: '',
        selected: false,
      },
    ],
    visible: true,
  },
  {
    state: 'tenants',
    name: 'Tenants',
    type: 'link',
    open: false,
    icon: 'groups',
    children: [],
    visible: false,
  },
  {
    state: 'users',
    name: 'Users',
    type: 'link',
    open: false,
    icon: 'person',
    children: [],
    visible: false,
  },
  {
    state: 'links',
    name: 'Links',
    type: 'sub',
    open: false,
    icon: 'local_library',
    children: [
      {
        state: 'https://api.masterloop.net/help',
        name: 'API',
        count: '',
        selected: false,
      },
      {
        state: 'https://www.masterloop.com/resources/',
        name: 'Resources',
        count: '',
        selected: false,
      },
      {
        state: 'https://www.masterloop.com/legal/privacy-policy',
        name: 'Privacy Policy',
        count: '',
        selected: false,
      },
      {
        state: './assets/pdf/External_Libraries.pdf',
        name: 'External Libraries',
        count: '',
        selected: false,
      },
    ],
    visible: true,
  },
  // {
  //   state: 'https://api.masterloop.net/help ',
  //   name: 'API',
  //   type: 'extTabLink',
  //   open: false,
  //   icon: 'local_library',
  //   children: [],
  //   visible: true,
  // },
  // {
  //   state: 'https://www.masterloop.com/resources/',
  //   name: 'Resources',
  //   type: 'extTabLink',
  //   open: false,
  //   icon: 'extension',
  //   children: [],
  //   visible: false,
  // },
];

@Injectable()
export class MenuItems {
  isLoggedInUserSystemAdmin;
  storedUserPermission;

  constructor(
    protected appSettings: AppSettings,
    private userPermission: userPermissionService,
    private userService: UserService
  ) {
    if (this.appSettings.api_version != '4') {
      this.getStoredUserPermission();
    }
  }
  getStoredUserPermission() {
    this.storedUserPermission =
      this.userPermission.getUserPermissionFromLocalStorage();
    if (this.storedUserPermission == null) {
      this.userService.getUserPermission().subscribe((result) => {
        if (result != null) {
          this.storedUserPermission = result;
          this.userPermission.setUserPermissionOnLocalStorage(result);
          this.isLoggedInUserSystemAdmin =
            this.storedUserPermission.IsSystemAdmin;
        }
      });
    } else {
      this.isLoggedInUserSystemAdmin = this.storedUserPermission.IsSystemAdmin;
    }
  }
  getAll(): Menu[] {
    let menuItems = MENUITEMS;
    menuItems.forEach((menuItem) => {
      if (menuItem['name'] == 'Links') {
        if (menuItem.children.length > 0) {
          menuItem.children.forEach((child) => {
            if (child['name'] == 'API') {
              let url = '';
              if (this.appSettings.api_version == '4') {
                url = `${this.appSettings.api_url}help`;
              } else {
                url = this.appSettings.api_url;
              }
              child['state'] = url;
            }
          });
        }
      }
      if (this.appSettings.api_version != '4') {
        if (menuItem['name'] == 'Users') {
          if (this.isLoggedInUserSystemAdmin) {
            menuItem['visible'] = true;
          }
        }
        if (menuItem['name'] == 'Tenants') {
          //if(this.isLoggedInUserSystemAdmin) {
          menuItem['visible'] = true;
          //}
        }
      }
    });

    return MENUITEMS;
  }

  clearDevices() {
    MENUITEMS[0].children = [
      { state: 'all', name: 'All Devices', count: '', selected: false },
    ];
  }
}
