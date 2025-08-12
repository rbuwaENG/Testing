import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AppSettings,
  ObservationService,
  LoggerService,
  LiveConnectionService,
  IndexedDbService,
  TemplateService,
  SiteSetting
} from '../../../../services';
import { DateExtension } from '../../../../core/extensions';
import { ObservationComponent } from '../observation.component';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import moment from 'moment';
import { NumberConstants } from '../../../../core/constants/number.constants';
import Highcharts from 'highcharts';
import { darkTheme, lightTheme } from 'src/assets/highcharts/highchartsthemes';
import { ThemeStyles } from './../../../../core/constants/theme-styles-constants';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'app-observation-plot',
  templateUrl: './plot.component.html',
  styleUrls: ['./plot.component.scss'],
})
export class ObservationPlotComponent extends ObservationComponent implements OnInit {
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
      title: { text: '' },
      chart: {
        zoomType: 'x'
      },
      series: [
        {
          name: `${this.observationName} ${this.abbrieviation ? `(${this.abbrieviation})` : ""}`,
          data: data,
          lineWidth: 1,
          fillOpacity: 0.5,
          marker: {
            fillColor: '#007dbd',
            lineColor: '#007dbd',
            radius: 3,
            fillOpacity: 0.5,
          }
        }
      ],
      line: {
        color: '#007dbd'
      },
      credits: {
        enabled: false
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Timestamp in UTC'
        },
      },
      yAxis: {
        title: {
          text: `${this.observationName} ${this.abbrieviation ? `(${this.abbrieviation})` : ""}`
        }
      },
      tooltip: {
        formatter: function () {
          const category = this.series.yAxis.categories[this.point.y] ? this.series.yAxis.categories[this.point.y] : this.point.y;
          const yAxisTitle = this.series.yAxis.axisTitle.textStr;
          const header = '<span style="font-size: smaller">' + moment(this.x).utc().format('dddd, MMMM DD, YYYY HH:mm'); + '</span>';
          return header + '<br>' + `<span style="color:${this.series.color}">● </span>` + yAxisTitle + " : " + '<span style="font-weight: bold">' + category + '</span>';
        }
      },
      legend: {
        enabled: false
      }
    };
  }

  protected onPreDataFetch(targetTab: any): void {
    super.onPreDataFetch(targetTab);
  }

  protected onDataReceivedSuccess(targetTab: any, data: any): void {
    super.onDataReceivedSuccess(targetTab, (data = data || []));
    data = (data instanceof Array ? data : [data]).map((elem) => [
      DateExtension.getTimestampAsMilliseconds(elem.Timestamp),
      Number(elem.Value),
    ]);
    if (this.observation.Quantity === NumberConstants.EnumerationGroupQuantityId) {
      let newCategories: string[] = [];
      this.enumItems.forEach(item => newCategories.push(`${item.Id}/ ${item.Name}`));
      targetTab.chart.yAxis[0].update({ categories: newCategories }, true);
    }
    var series = targetTab.chart.series[0];
    if (!targetTab.isLive) {
      series.setData(data, true);
    } else if (data.length > 10) {
      data.forEach((m) => series.addPoint(m, false));
      targetTab.chart.redraw();
    } else {
      data.forEach((m) => series.addPoint(m));
    }
    targetTab.chart.reflow();
  }

  public saveChart(targetTab: any, chart: any) {
    targetTab.chart = chart;
  }
}
