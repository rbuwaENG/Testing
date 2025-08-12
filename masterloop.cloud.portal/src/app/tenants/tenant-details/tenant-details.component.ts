import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DeviceTemplate } from 'src/app/core/models/device-template';
import { Tenant } from 'src/app/core/models/tenant';
import { LoggerService } from 'src/app/services/logger.service';
import { TemplateService } from 'src/app/services/template.service';
import { TenantService } from 'src/app/services/tenant.service';

@Component({
  selector: 'app-tenant-details',
  templateUrl: './tenant-details.component.html',
  styleUrls: ['./tenant-details.component.scss']
})
export class TenantDetailsComponent implements OnInit {

  tenantId: number;
  tenantName: string;
  tenants: Tenant[] = [];
  isMobile: boolean = false;
  templates: DeviceTemplate[] = [];
  tenantTemplates: DeviceTemplate[] = [];

  constructor(
    private route: ActivatedRoute,
    private templateService: TemplateService,
    private tenantService: TenantService,
    private loggerService: LoggerService,
    private router: Router
  ) {
    this.tenantId = +this.route.snapshot.params['tenandId'];
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

  ngOnInit(): void {
    let getTenantsInfo = this.tenantService.getTenants();
    let getTemplatesInfo = this.templateService.getTemplates();
    forkJoin([getTenantsInfo, getTemplatesInfo]).subscribe(results => {
      let selectedTenant: Tenant;
      if (results[0]) {
        this.tenants = results[0].map(t => new Tenant(t.Id, t.Name, t.Features, t.TemplateIds));
        selectedTenant = this.tenants.find(t => t.id == this.tenantId);
        this.tenantName = selectedTenant?.name;
      }
      if ((results[1])) {
        this.templates = results[1].map(t => new DeviceTemplate(t.Id, t.Name));
        this.tenantTemplates = this.templates.filter(t => selectedTenant?.templateIds?.includes(t.Id));
      }
    }, error => {
      this.loggerService.showErrorMessage('Getting tenant related information failed!');
    });
  }

  navigateToList() {
    this.router.navigateByUrl(`tenants`);
  }

  navigateToTemplateDetails(tid) {
    this.router.navigateByUrl(`templates/details/edit/${tid}`);
  }
}
