import { Injectable } from '@angular/core';
import { LocalStorageKeys } from '../core/constants';
import { UserService } from './user.service';

@Injectable({
    providedIn: 'root'
  })

  export class userPermissionService {

    constructor(private userService: UserService) {}

    ngOnInit() {}

    getUserPermission() {
        this.userService.getUserPermission().subscribe((result) => {
            if(result != null) {
                this.setUserPermissionOnLocalStorage(result);
            }
          });
    }

    setUserPermissionOnLocalStorage(result) {
        localStorage.setItem(LocalStorageKeys.USER_INFO,
            JSON.stringify(result)
        );
    }

    getUserPermissionFromLocalStorage() {
        let userInfo = JSON.parse(localStorage.getItem(LocalStorageKeys.USER_INFO));
        return userInfo;
    }

    removeUserPermissionFromLocalStorage() {
        localStorage.removeItem(LocalStorageKeys.USER_INFO);
    }

  }