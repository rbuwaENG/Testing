import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogsService, LoggerService } from 'src/app/services';
import { DashboardService } from 'src/app/services/dashboard.service'
import { TemplateDashboard } from 'src/app/core/models/dashboard/template-dashboard'

@Component({
  selector: 'app-template-dashboard',
  templateUrl: './template-dashboard.component.html',
  styleUrls: ['./template-dashboard.component.scss']
})
export class TemplateDashboardComponent implements OnInit {

  TID: any;
  listOfDashboards: TemplateDashboard[];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogsService,
    private viewContainerRef: ViewContainerRef,
    private loggerService: LoggerService,
    private dashboardService: DashboardService
  ) {
    this.TID = this.route.snapshot.params['templateId'];
  }

  ngOnInit(): void {
    this.getTemplateDashboards()
  }

  getTemplateDashboards() {
    this.dashboardService.getAllTemplateDashboards(this.TID).subscribe((res: any[]) => {
      if(!res){
        this.listOfDashboards = [];
        return;
      }

      res.sort((f, n): number => {
        if (f.Index < n.Index) return -1;
        if (f.Index > n.Index) return 1;
        return 0;
      });
      this.listOfDashboards = res;
    });
  }

  navigateToEditDashboard(dashboardId: string) {
    this.router.navigateByUrl(`templates/${this.TID}/dashboards/${dashboardId}/edit`);
  }

  navigateToCreateDashboard() {
    this.router.navigateByUrl(`templates/${this.TID}/dashboards/new`);
  }

  deleteDashboardDialog(dashboardId: string, rowIndex: any) {
    this.dialogService
      .confirm(
        'Confirm Dialog',
        'Are you sure you want to delete the dashboard?',
        true,
        this.viewContainerRef
      )
      .subscribe(res => {
        if (res == true) {
          this.deleteDashboard(dashboardId);
        }
      });
  }

  private deleteDashboard(dashboardId: string) {
    this.dashboardService.deleteTemplateDashboard(this.TID, dashboardId).subscribe(deleteResult => {
      if (deleteResult == null) {
        this.loggerService.showSuccessfulMessage('Dashboard deleted successfully.');
        this.getTemplateDashboards();
      }
    }, error => {
      this.loggerService.showErrorMessage('Dashboard deletion failed.');
      console.log(error);
    });
  }
}
