import { Injectable } from '@angular/core';
import { time } from 'console';
import { AddOnFeature } from '../core/enums/add-on-feature.enum';
import { Tenant } from '../core/models/tenant';

@Injectable({
  providedIn: 'root'
})
export class AddOnFeaturesService {

  constructor() { }

  isFeatureEnabled(templateId: string, feature: AddOnFeature, tenants: Tenant[]): boolean {
    let filteredTenant = tenants.find(t => t?.templateIds?.includes(templateId));
    if (filteredTenant?.features) {
      return filteredTenant.features.includes(feature);
    }
    return false;
  }
}
