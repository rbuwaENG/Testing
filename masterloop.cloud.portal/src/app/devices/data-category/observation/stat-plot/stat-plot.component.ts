import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DateExtension } from 'src/app/core/extensions';
import {
  AppSettings,
  IndexedDbService,
  LiveConnectionService,
  LoggerService,
  ObservationService,
  SiteSetting,
  TemplateService,
} from 'src/app/services';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ObservationComponent } from '../observation.component';
import Highcharts from 'highcharts';
import { darkTheme, lightTheme } from 'src/assets/highcharts/highchartsthemes';
import { ThemeStyles } from './../../../../core/constants/theme-styles-constants';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'app-stat-plot',
  templateUrl: './stat-plot.component.html',
  styleUrls: ['./stat-plot.component.scss'],
})
export class StatPlotComponent extends ObservationComponent implements OnInit {
  constructor(
    protected route: ActivatedRoute,
    protected appSettings: AppSettings,
    protected observationService: ObservationService,
    protected loggerService: LoggerService,
    protected liveConnectionService: LiveConnectionService,
    protected indexedDbService: IndexedDbService,
    protected cache: LocalStorageService,
    protected templateService: TemplateService,
    private siteSettings: SiteSetting
  ) {
    super(
      appSettings,
      loggerService,
      liveConnectionService,
      route,
      observationService,
      indexedDbService,
      cache,
      templateService
    );
  }

  public ngOnInit() {
    super.ngOnInit();
    this.siteSettings.themeType.valueChanges
    .pipe(startWith(this.siteSettings.themeType.getValue()))  
    .subscribe((theme) => {
      this.tabs.forEach(
        (m) => ((m.options = this._getChartOptions()), (m.chart = []))
      );
      Highcharts.setOptions((ThemeStyles.darkMode === theme) ? darkTheme : lightTheme);
      this.onTabSelectedChanged(this.selectedTabIndex);
    });
  }

  private _getChartOptions(data: any[] = []): any {
    return {
      title: { text: this.observationId + '-' + this.observationName },
      chart: {
        zoomType: 'x',
      },
      series: [
        {
          name: `(${this.observationName}) Mean`,
          data: data,
          zIndex: 1,
          //lineWidth: 1,
          fillOpacity: 0.5,
          marker: {
            fillColor: 'white',
            lineWidth: 2,
            lineColor: '#0D68AF',
            states: {
              hover: {
                fillColor: '#0D68AF',
              },
            },
          },
        },
        {
          name: `(${this.observationName}) Median`,
          data: data,
          zIndex: 1,
          //lineWidth: 1,
          fillOpacity: 0.5,
          //fillColor: '#FF4A02',
          marker: {
            fillColor: 'white',
            lineWidth: 2,
            lineColor: '#FF4A02',
            states: {
              hover: {
                fillColor: '#FF4A02',
              },
            },
          },
        },
        {
          name: `(${this.observationName}) StdDev +/-`,
          data: data,
          showInLegend: true,
          type: 'arearange',
          lineWidth: 0,
          color: '#FFC002',
          fillOpacity: 0.5,
          zIndex: 0,
          fillColor: '#FFC002',
          marker: {
            enabled: false,
          },
        },
        {
          name: `(${this.observationName}) Min/Max`,
          data: data,
          showInLegend: true,
          type: 'arearange',
          lineWidth: 0,
          color: '#0D68AF',
          fillOpacity: 0.15,
          zIndex: 1,
          marker: {
            enabled: false,
          },
        },
      ],
      credits: {
        enabled: false,
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Timestamp in UTC',
        },
      },
      tooltip: {
        crosshairs: true,
        shared: true,
      },
    };
  }

  protected onPreDataFetch(targetTab: any): void {
    super.onPreDataFetch(targetTab);
    // if (targetTab.chart && targetTab.chart.series[0]) {
    //   targetTab.chart.series[0].setData([], true);
    // }
  }

  protected onDataReceivedSuccess(targetTab: any, data: any): void {
    super.onDataReceivedSuccess(targetTab, (data = data || []));

    data = (data instanceof Array ? data : [data]).map((elem) => [
      DateExtension.getTimestampAsMilliseconds(elem.Timestamp),
      elem.Value,
    ]);
    let obsMedian = [];
    let stdDevRange = [];
    let minMaxRange = [];
    let meanAverrage = [];
    let time = [];
    var meanSeries = targetTab.chart.series[0];
    var medianSeries = targetTab.chart.series[1];
    var stdDevSeries = targetTab.chart.series[2];
    var minMaxSeries = targetTab.chart.series[3];

    data.forEach((item) => {
      time.push(item[0]);
      if (item[1].StdDev != 'NaN') {
        stdDevRange.push([item[0], Math.abs(item[1].StdDev), item[1].StdDev]);
      }
      if (item[1].Mean != 'NaN') {
        meanAverrage.push([item[0], item[1].Mean]);
      }
      if (item[1].Median != 'NaN') {
        obsMedian.push([item[0], item[1].Median]);
      }
      if (item[1].Minimum != 'NaN' && item[1].Maximum != 'NaN') {
        minMaxRange.push([item[0], item[1].Minimum, item[1].Maximum]);
      }
    });

    if (stdDevRange.length == 0) {
      stdDevSeries.remove(true);
    }
    if (meanAverrage.length == 0) {
      meanSeries.remove(true);
    }
    if (obsMedian.length == 0) {
      medianSeries.remove(true);
    }
    if (minMaxRange.length == 0) {
      minMaxSeries.remove(true);
    }

    if (targetTab.isLive) {
      meanAverrage.forEach((m) => meanSeries.addPoint(m));
      obsMedian.forEach((m) => medianSeries.addPoint(m));
      stdDevRange.forEach((m) => stdDevSeries.addPoint(m));
      minMaxRange.forEach((m) => minMaxSeries.addPoint(m));
      targetTab.chart.reflow();
      targetTab.chart.redraw();
    } else {
      if (meanAverrage.length > 0 && typeof meanSeries != 'undefined') {
        meanSeries.setData(meanAverrage);
        targetTab.chart.redraw();
      }
      if (obsMedian.length > 0 && typeof medianSeries != 'undefined') {
        medianSeries.setData(obsMedian);
        targetTab.chart.redraw();
      }
      if (stdDevRange.length > 0 && typeof stdDevSeries != 'undefined') {
        stdDevSeries.setData(stdDevRange);
        targetTab.chart.redraw();
      }
      if (minMaxRange.length > 0 && typeof minMaxSeries != 'undefined') {
        minMaxSeries.setData(minMaxRange);
        targetTab.chart.redraw();
      }
    }
    targetTab.chart.reflow();
  }

  public saveChart(targetTab: any, chart: any) {
    targetTab.chart = chart;
  }
}
