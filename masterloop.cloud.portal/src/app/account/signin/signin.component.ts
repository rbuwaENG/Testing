import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { AuthenticationService } from '../../services/authentication.service';
import { AuthenticationCredentials } from '../../core/models/authentication';
import { AppSettings, SiteSetting } from 'src/app/services';
import { LocalStorageKeys } from 'src/app/core/constants';
import * as moment from 'moment';
import { userPermissionService } from 'src/app/services/user-permission.service';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
})
export class SigninComponent implements OnInit {
  public form: FormGroup;
  public credentials: AuthenticationCredentials;

  constructor(
    private router: Router,
    private auth: AuthenticationService,
    private userPermission: userPermissionService,
    private appSettings: AppSettings,
    private siteSettings: SiteSetting
  ) {
    this.siteSettings.initTheme();
    this.credentials = new AuthenticationCredentials();
  }

  private buildForm() {
    this.form = new FormGroup({
      username: new FormControl(this.credentials.username, [
        Validators.required,
      ]),
      password: new FormControl(this.credentials.password, [
        Validators.required,
      ]),
    });
  }

  ngOnInit() {
    this.buildForm();
  }

  onSubmit() {
    this.auth
      .authenticate(Object.assign(this.credentials, this.form.value))
      .subscribe(
        (result: boolean) => {
          if (this.appSettings.api_version == '5') {
            this.userPermission.getUserPermission();
          }
          var currentUTC = moment.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
          localStorage.setItem(
            LocalStorageKeys.DEVICES_LAST_UPDATED_ON,
            currentUTC
          );

          let lastSelectedFolder = JSON.parse(
            localStorage.getItem(LocalStorageKeys.LAST_FOLDER)
          );
          if (lastSelectedFolder != null) {
            if (lastSelectedFolder == 'recent') {
              this.router.navigateByUrl('/devices/filter/recent');
            } else if (lastSelectedFolder == 'starred') {
              this.router.navigateByUrl('/devices/filter/starred');
            } else if (lastSelectedFolder == 'found') {
              this.router.navigateByUrl('/devices/all');
            } else if (lastSelectedFolder == '1') {
              this.router.navigateByUrl('/');
            } else if (lastSelectedFolder == 'All') {
              this.router.navigateByUrl('/devices/all');
            } else {
              this.router.navigateByUrl(
                '/devices/listingbytemplate/' + lastSelectedFolder
              );
            }
          } else {
            this.router.navigateByUrl('/');
          }
        },
        (error: any) => {
          this.form.setErrors({ '': 'Invalid Username or password..' });
        }
      );
  }
}
