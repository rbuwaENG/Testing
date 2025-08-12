import { Component, OnInit, ViewContainerRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  TemplateService,
  LoggerService,
  DialogsService,
  SearchService,
} from '../../services';
import { Router } from '@angular/router';
import { isNullOrUndefined } from 'util';
import { userPermissionService } from 'src/app/services/user-permission.service';
import { AddOnFeaturesService } from 'src/app/services/add-on-features.service';
import { AddOnFeature } from 'src/app/core/enums/add-on-feature.enum';
import { FeaturePopupComponent } from 'src/app/feature/feature-popup/feature-popup.component';
import { TenantService } from 'src/app/services/tenant.service';
import { Tenant } from 'src/app/core/models/tenant';
import { forkJoin } from 'rxjs/internal/observable/forkJoin';

@Component({
  selector: 'app-template-list',
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.scss'],
})
export class TemplateListComponent implements OnInit {
  @ViewChild('templateListTable') table: any;

  templatesList: any;
  lastTemplate: any;
  temp = [];
  isMobile: boolean = false;
  expanded: any = {};
  templateSearch = '';
  isCompact: boolean = false;
  selectedView = 'default-tb';
  tenantList: Tenant[] = [];

  constructor(
    private templateService: TemplateService,
    private loggerService: LoggerService,
    private tenantService: TenantService,
    private router: Router,
    private dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private searchService: SearchService,
    private userPermission: userPermissionService,
    private addOnFeaturesService: AddOnFeaturesService,
    public dialog: MatDialog
  ) {
    /**Mobile UI trigger */
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) &&
      document.documentElement.clientWidth < 768
    ) {
      this.isMobile = true;
    }
  }

  showFeatureNotAvailableDialog(feature: AddOnFeature) {
    this.dialog.open(FeaturePopupComponent, {
      data: {
        addOnFeature: feature,
      },
    });
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
  }
  ngOnInit() {
    this.templateSearch = '';
    let getTenantsInfo = this.tenantService.getTenants();
    let getTemplatesInfo = this.templateService.getTemplates();

    forkJoin([getTenantsInfo, getTemplatesInfo]).subscribe(
      (result) => {
        this.tenantList = result[0]?.map(
          (t) => new Tenant(t['Id'], t['Name'], t['Features'], t['TemplateIds'])
        );

        let userPermission =
          this.userPermission.getUserPermissionFromLocalStorage();
        this.templatesList = result[1]?.sort((a: any, b: any) =>
          a.Id.localeCompare(b.Id)
        );

        if (userPermission != null) {
          let userPermittedPermission = userPermission['Templates'];
          this.templatesList.forEach((template) => {
            userPermittedPermission.forEach((permission) => {
              if (template.Id == permission.TemplateId) {
                template['CanAdmin'] = permission.CanAdmin;
                template['CanControl'] = permission.CanControl;
                template['CanObserve'] = permission.CanObserve;
              }
            });
          });
        } else {
          this.templatesList.forEach((template) => {
            template['CanAdmin'] = true;
            template['CanControl'] = true;
            template['CanObserve'] = true;
          });
        }

        this.temp = [...this.templatesList];
        if (!isNullOrUndefined(this.searchService.search)) {
          this.filterTemplates((this.lastTemplate = this.searchService.search));
        } else {
          this.updateGlobalSearch(this.lastTemplate);
        }
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting templates failed!');
      }
    );

    this.searchService.searchdValue$.subscribe((data) => {
      this.lastTemplate = data;
      this.updateGlobalSearch(data);
    });
  }

  searchTemplate(event) {
    this.templatesList = this.temp;
    this.templatesList = this.templatesList.filter(
      (d) =>
        !this.templateSearch ||
        d.Id.toLowerCase().indexOf(this.templateSearch.toLowerCase()) >= 0 ||
        d.Name.toLowerCase().indexOf(this.templateSearch.toLowerCase()) >= 0
    );
  }

  onValChange(value) {
    // this.updateDeviceListModeOnLocal(value);
    this.selectedView = value;
    if (value == 'compact-tb') {
      this.isCompact = true;
    } else {
      this.isCompact = false;
    }
  }

  clearTemplateSearch() {
    this.templateSearch = '';
    this.templatesList = this.temp;
  }

  navigateToFirmware(tId: string) {
    if (
      !this.addOnFeaturesService.isFeatureEnabled(
        tId,
        AddOnFeature.Firmware,
        this.tenantList
      )
    ) {
      this.showFeatureNotAvailableDialog(AddOnFeature.Firmware);
      return;
    }
    this.router.navigateByUrl(`templates/${tId}/firmwareManager`);
  }

  navigateToDashboard(tId: string) {
    if (
      !this.addOnFeaturesService.isFeatureEnabled(
        tId,
        AddOnFeature.Dashboard,
        this.tenantList
      )
    ) {
      this.showFeatureNotAvailableDialog(AddOnFeature.Dashboard);
      return;
    }
    this.router.navigateByUrl(`templates/${tId}/dashboards`);
  }

  updateGlobalSearch(event) {
    let query;
    if (event) {
      query = event;
    }
    this.filterTemplates(query);
    if (event && event.keyCode == 13 && this.temp.length == 1) {
      this.router.navigateByUrl('templates/details/view/' + this.temp[0].Id);
    }
  }

  filterTemplates(query: string): void {
    this.templatesList = this.temp.filter(
      (d) =>
        !query ||
        d.Id.toLowerCase().indexOf(query.toLowerCase()) >= 0 ||
        d.Name.toLowerCase().indexOf(query.toLowerCase()) >= 0
    );
  }

  navigateToDetails(tid) {
    this.router.navigateByUrl('templates/details/edit/' + tid); //Convert this to edit URL when API are created for editng
  }

  deleteTemplate(tid) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the template?',
        true,
        this.viewContainerRef
      )
      .subscribe((res) => {
        if (res == true) {
          // this.changedSettings.splice(0, this.changedSettings.length);
        }
      });
  }

  sort(event, sortStatus) {
    this.templatesList = [
      ...this.templatesList.sort(
        (first: any, second: any) =>
          (event.prop != 'Name' && event.prop != 'Id'
            ? 0
            : first[event.prop].localeCompare(second[event.prop])) *
          (sortStatus ? 1 : -1)
      ),
    ];
  }

  getTenantName(templateId: string): string {
    let selectedTenant = this.tenantList?.find((tenant) =>
      tenant.templateIds?.includes(templateId)
    );
    return selectedTenant?.name;
  }

  navigateToTenant(templateId: string) {
    let selectedTenant = this.tenantList?.find((tenant) =>
      tenant.templateIds?.includes(templateId)
    );
    this.router.navigateByUrl(`tenants/${selectedTenant?.id}/details`);
  }
}
