import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantService } from 'src/app/services/tenant.service';
import { AddOnFeaturesService } from '../../services/add-on-features.service';
import { AddOnFeature } from '../enums/add-on-feature.enum';
import { Tenant } from '../models/tenant';

@Injectable({
  providedIn: 'root',
})
export class AddOnFeatureToggleGuard implements CanActivate {
  constructor(
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
    //In order to work this guard templateId must be available in routing params
    let templateId = next.params['templateId'] as string;
    let feature = next.data['addOnFeature'] as AddOnFeature;

    return this.tenantService.getTenants().pipe(
      map((tenants) => {
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
