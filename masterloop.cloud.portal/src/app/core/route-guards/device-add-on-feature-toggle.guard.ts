import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { TenantService } from '../../services/tenant.service';
import { AddOnFeaturesService } from '../../services/add-on-features.service';
import { AddOnFeature } from '../enums/add-on-feature.enum';
import { Tenant } from '../models/tenant';
import { map } from 'rxjs/operators';
import { DeviceService } from 'src/app/services/device.service';

@Injectable({
  providedIn: 'root',
})
export class DeviceAddOnFeatureToggleGuard implements CanActivate {
  constructor(
    private deviceService: DeviceService,
    private addOnFeaturesService: AddOnFeaturesService,
    private tenantService: TenantService
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    let deviceId = next.params['deviceId'] as string;
    let feature = next.data['addOnFeature'] as AddOnFeature;

    let getDeviceDetails = this.deviceService.getDeviceDetails(deviceId);
    let getTenantDetails = this.tenantService.getTenants();

    return forkJoin([getDeviceDetails, getTenantDetails]).pipe(
      map((data) => {
        let templateId = data[0] ? data[0]['TemplateId'] : '';
        let tenants = data[1];

        let tenantList = tenants?.map(
          (t) => new Tenant(t['Id'], t['Name'], t['Features'], t['TemplateIds'])
        );
        if (
          this.addOnFeaturesService.isFeatureEnabled(
            templateId,
            feature,
            tenantList
          )
        ) {
          return true;
        }
        window.location.href = '/';
        return false;
      })
    );
  }
}
