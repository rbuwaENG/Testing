import { ViewChild, OnDestroy, Component } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { merge } from 'rxjs';
import { DeviceService, LoggerService, AppSettings } from '../services';
import { OptionsTabShowingStatus } from '../core/enums';

@Component({
  template: ''
})
export abstract class TemplateAnalyzerMasterComponent implements OnDestroy {
  @ViewChild(MatSidenav)
  protected OptionsTabSidenav: MatSidenav;
  public readonly OptionsTabShowingStatus: any = OptionsTabShowingStatus;
  public selectedOptionsTabShowingStatus: OptionsTabShowingStatus;

  constructor(
    protected appSettings: AppSettings,
    protected loggerService: LoggerService,
    protected deviceService: DeviceService
  ) {
    this.toggleOptionsTabShowingStatus(OptionsTabShowingStatus.Select);
  }

  ngOnInit() {
    merge(this.OptionsTabSidenav.closedStart).subscribe((value: any) => {
      this.selectedOptionsTabShowingStatus = this.OptionsTabSidenav.opened
        ? this.selectedOptionsTabShowingStatus
        : OptionsTabShowingStatus.None;
    });
  }

  /**
   * Update the status of options-tab. If new status is same as the old sidenav will be closed...
   * @param status new status to update with.
   */
  public toggleOptionsTabShowingStatus(status: OptionsTabShowingStatus): void {
    this.selectedOptionsTabShowingStatus =
      status === this.selectedOptionsTabShowingStatus
        ? OptionsTabShowingStatus.None
        : status;
    if (!this.OptionsTabSidenav) {
      return;
    }
    this.selectedOptionsTabShowingStatus === OptionsTabShowingStatus.None
      ? this.OptionsTabSidenav.close()
      : this.OptionsTabSidenav.open();
  }

  ngOnDestroy(): void {}
}
