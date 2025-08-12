import { Component, OnInit, Input, OnDestroy, Output, EventEmitter } from '@angular/core';
import * as moment from 'moment';
/* importing internals ... */
import { BasePlottableComponent } from '../base.plottable.component';
import { ObservationStruct, DeviceStruct } from '../../../core/models';
import { StringExtension } from '../../../core/extensions';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SiteSetting, TemplateService } from 'src/app/services';

import Highcharts from 'highcharts';
import { lightTheme, darkTheme } from '../../../../assets/highcharts/highchartsthemes';
import { ThemeStyles } from 'src/app/core/constants/theme-styles-constants';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'app-infograph-plot',
  templateUrl: './plot.component.html',
  styleUrls: ['./plot.component.css'],
})
export class PlotComponent extends BasePlottableComponent implements OnDestroy {
  @Input()
  graphicOptions: any;
  @Input()
  from: moment.Moment;
  @Input()
  to: moment.Moment;

  chart: any;
  subscriptions: any;
  selectedObservations = [];

  quantities: QuantityItem[];
  isThemeChanged: boolean = false;

  constructor(
    private cache: LocalStorageService,
    private templateService: TemplateService,
    protected siteSettings: SiteSetting,
  ) {
    super();
    this.subscriptions = {};
    this.selectedObservations = [];
    this.getTemplateUnits();
  }

  ngOnInit() {

    this.siteSettings.themeType.valueChanges
    .pipe(startWith(this.siteSettings.themeType.getValue()))  
    .subscribe((theme) => {
      this.isThemeChanged = true;
      this.renderDevices();
      this.setChartOptions();
      let currentTheme = (ThemeStyles.darkMode === theme) ? darkTheme : lightTheme;
      if (this.chart) {
        this.chart.update(currentTheme);
        // to update color of each of y axis
        this.chart.yAxis.forEach((y, i) => {
          this.chart.yAxis[i].update({
            title: {
              style: {
                color: currentTheme.yAxis.title.style.color,
              },
            },
          });
        });
      }
      Highcharts.setOptions(currentTheme);
    });
  }

  getTemplateUnits() {
    this.quantities = this.cache.getQuantities();
    if (!this.quantities) {
      this.templateService.getUnits().subscribe((data) => {
        this.quantities = data['Quantities'] as QuantityItem[];
        this.cache.setQuantities(this.quantities);
      });
    }
  }

  setChart(chart) {
    this.chart = chart;
    this.renderDevices();
  }

  protected renderObservation(
    device: DeviceStruct | any,
    observation: ObservationStruct | any
  ): void {
    /*
      - get options for observations.
      - if options is default && if no default options exists with same datatype
        - add options
      - else 
     */
    //Handle common y-axis for the same ObservationId if the mid belong to the same template
    observation = this.setAbbreviation(observation);
    observation['commonYAxis'] = false;
    if (this.selectedObservations.length > 0) {
      let observationExist = this.selectedObservations.filter(
        (o) =>
          o.TemplateId == device.TemplateId && o.ObservationId == observation.Id
      );

      if (observationExist.length == 0) {
        let data = {};
        data['TemplateId'] = device.TemplateId;
        data['MID'] = device.MID;
        data['ObservationId'] = observation.Id;
        this.selectedObservations.push(data);
      } else if (!this.isThemeChanged)  {
        observation['commonYAxis'] = true;
      }
    } else {
      let data = {};
      data['TemplateId'] = device.TemplateId;
      data['MID'] = device.MID;
      data['ObservationId'] = observation.Id;
      this.selectedObservations.push(data);
      observation['commonYAxis'] = false;
    }
    if (observation.DataType != 7) {
      /* composing YAxis options ... */
      var options: any = {
        id: StringExtension.toSnakeCase(
          `yaxis_${device.MID}_${observation.DataType}_${observation.Id}`
        ),
        gridLineWidth: 1,
        opposite: false,
        title: {
          text: `${device.MID} - ${observation.Name} ${observation.UnitAbbreviation ? ` (${observation.UnitAbbreviation})` : ''}`,
        },
      };
      if (observation.commonYAxis) {
        options.title = { text: '' };
      }
      Object.assign(
        options,
        (this.graphicOptions.options || {}).yAxis || {},
        (observation.options || {}).yAxis || {
          id: StringExtension.toSnakeCase(
            `yaxis_${device.MID}_${observation.DataType}_${null}`
          ),
        }
      );
      var yAxisOptions = this.chart.get(options.id);
      if (!yAxisOptions) {
        this.chart.addAxis(options);
        yAxisOptions = this.chart.get(options.id);
      }

      /* composing series options ... */
      options = {
        id: StringExtension.toSnakeCase(
          `series_${device.MID}_${observation.Id}`
        ),
        name: `${device.MID} - ${observation.Name} ${observation.UnitAbbreviation ? ` (${observation.UnitAbbreviation})` : ''}`,
        yAxis: yAxisOptions.options.id,
        lineWidth: 1,
        zIndex: 1,
        fillOpacity: 0.5,
        marker: {
          radius: 3,
          fillOpacity: 0.5,
          symbol: 'circle',
        },
      };

      observation._seriesId = options.id;
      var seriesOptions = this.chart.get(options.id);
      if (seriesOptions) {
        seriesOptions.update(options);
      } else {
        seriesOptions = this.chart.addSeries(options);
        /* render current values ... */
        this._onObservationValuesChange(
          observation,
          observation._values.getValue()
        );
        /* subscribe to value changes and render series points ... */
        var subscriptions = (this.subscriptions[observation._seriesId] =
          this.subscriptions[observation._seriesId] || []);
        subscriptions.push(
          observation._values.valueChanges.subscribe((values: any[]) =>
            this._onObservationValuesChange(observation, values)
          )
        );
        subscriptions.push(
          observation._values.itemsAdded.subscribe((values: any[]) =>
            this._onObservationValuesChange(observation, values, true)
          )
        );
      }
      // remove all default y-axes ...
      this.chart.yAxis.filter((m) => !m.options.id).forEach((m) => m.remove());
      this.chart.reflow();
    } else {
      var options: any = {
        id: StringExtension.toSnakeCase(
          `yaxis_${device.MID}_${observation.DataType}_${observation.Id}`
        ),
        gridLineWidth: 1,
        opposite: false,
        title: { text: `${device.MID} - ${observation.Name}-test` },
      };

      Object.assign(
        options,
        (this.graphicOptions.options || {}).yAxis || {},
        (observation.options || {}).yAxis || {
          id: StringExtension.toSnakeCase(
            `yaxis_${device.MID}_${observation.DataType}_${null}`
          ),
        }
      );
      var yAxisOptions = this.chart.get(options.id);
      if (!yAxisOptions) {
        this.chart.addAxis(options);
        yAxisOptions = this.chart.get(options.id);
      }
      let types = ['Mean', 'Median', 'StdDev', 'MinMax'];

      let seriesSet = [];

      types.forEach((type) => {
        var options: any = {
          id: StringExtension.toSnakeCase(
            `yaxis_${device.MID}_${observation.DataType}_${observation.Id}_${type}`
          ),
          gridLineWidth: 1,
          opposite: false,
          title: { text: `${device.MID} - ${observation.Name}-test` },
        };
        if (type == 'StdDev') {
          options = {
            id: StringExtension.toSnakeCase(
              `series_${device.MID}_${observation.Id}_${type}`
            ),
            name: `${device.MID} - ${observation.Name} - ${type}`,
            showInLegend: true,
            type: 'arearange',
            lineWidth: 0,
            color: '#FFC002',
            fillOpacity: 0.5,
            zIndex: 0,
            fillColor: '#FFC002',
            marker: {
              radius: 3,
              fillOpacity: 0.5,
              enabled: false,
            },
          };
        } else if (type == 'MinMax') {
          options = {
            id: StringExtension.toSnakeCase(
              `series_${device.MID}_${observation.Id}_${type}`
            ),
            name: `${device.MID} - ${observation.Name} - ${type}`,
            showInLegend: true,
            type: 'arearange',
            lineWidth: 0,
            color: '#0D68AF',
            fillOpacity: 0.15,
            zIndex: 1,
            marker: {
              radius: 3,
              fillOpacity: 0.5,
              enabled: false,
            },
          };
        } else {
          options = {
            id: StringExtension.toSnakeCase(
              `series_${device.MID}_${observation.Id}_${type}`
            ),
            name: `${device.MID} - ${observation.Name} - ${type}`,
            yAxis: yAxisOptions.options.id,
            zIndex: 1,
            //lineWidth: 1,
            fillOpacity: 0.5,
            //fillColor: '#FF4A02',
            marker: {
              radius: 3,
              fillOpacity: 0.5,
              fillColor: 'white',
              lineWidth: 2,
              lineColor: '#FF4A02',
              states: {
                hover: {
                  fillColor: '#FF4A02',
                },
              },
            },
          };
        }
        seriesSet.push(options);
      });
      seriesSet.forEach((serie) => {
        observation._seriesId = serie.id;
        var seriesOptions = this.chart.get(serie.id);
        if (seriesOptions) {
          seriesOptions.update(serie);
        } else {
          seriesOptions = this.chart.addSeries(serie);
          this._onObservationValuesChange(
            observation,
            observation._values.getValue()
          );
          /* subscribe to value changes and render series points ... */
          var subscriptions = (this.subscriptions[observation._seriesId] =
            this.subscriptions[observation._seriesId] || []);
          subscriptions.push(
            observation._values.valueChanges.subscribe((values: any[]) =>
              this._onObservationValuesChange(observation, values)
            )
          );
          subscriptions.push(
            observation._values.itemsAdded.subscribe((values: any[]) =>
              this._onObservationValuesChange(observation, values, true)
            )
          );
        }
      });
      this.chart.reflow();
    }
  }

  setAbbreviation(observation: any): any {
    let unit = null;
    let quantity = this.quantities.find((x) => x.Id === observation.Quantity);
    if (quantity.Units) {
      unit = quantity.Units.find((x) => x.Id === observation.Unit);
      observation.UnitAbbreviation = unit.Abbreviation;
    } else {
      observation.UnitAbbreviation = null;
    }

    return observation;
  }

  private _onObservationValuesChange(
    observation: ObservationStruct | any,
    values: any[],
    append: boolean = false
  ): void {
    /* skip if observation series was not found ... */
    if (observation.DataType != 7) {
      var seriesOptions = null;
      if (!(seriesOptions = this.chart.get(observation._seriesId))) {
        return;
      }
      /* map values to points. And set if not appending. else add each point .... */
      values = values.map((m) => [m.Timestamp, Number(m.Value)]);

      if (!append) {
        return seriesOptions.setData(values);
      }
      values.forEach((m) => seriesOptions.addPoint(m));
    } else {
      values = values.map((m) => [m.Timestamp, m.Value]);

      let obsMedian = [];
      let stdDevRange = [];
      let minMaxRange = [];
      let meanAverrage = [];
      let time = [];
      values.forEach((item) => {
        time.push(item[0]);
        meanAverrage.push([item[0], item[1].Mean]);
        obsMedian.push([item[0], item[1].Median]);
        stdDevRange.push([item[0], Math.abs(item[1].StdDev), item[1].StdDev]);
        minMaxRange.push([item[0], item[1].Minimum, item[1].Maximum]);
      });

      // if(typeof(this.chart.series.userOptions) == "undefined") {
      //   return;
      // }
      var meanSeries: any;
      var medianSeries: any;
      var stdDevSeries: any;
      var minMaxSeries: any;

      this.chart.series.forEach((chart) => {
        let typeSeries = chart.userOptions.id.split('_').pop();
        if (typeSeries == 'mean') {
          meanSeries = chart;
        } else if (typeSeries == 'median') {
          medianSeries = chart;
        } else if (typeSeries == 'stddev') {
          stdDevSeries = chart;
        } else if (typeSeries == 'minmax') {
          minMaxSeries = chart;
        }
      });
      //var meanSeries = this.chart.series[0];
      //var medianSeries = this.chart.series[1];
      //var stdDevSeries = this.chart.series[2];
      //var minMaxSeries = this.chart.series[3];

      if (append) {
        meanAverrage.forEach((m) => meanSeries.addPoint(m));
        obsMedian.forEach((m) => medianSeries.addPoint(m));
        stdDevRange.forEach((m) => stdDevSeries.addPoint(m));
        minMaxRange.forEach((m) => minMaxSeries.addPoint(m));
        this.chart.redraw();
      } else {
        if (meanAverrage.length > 0 && typeof meanSeries != 'undefined') {
          meanSeries.setData(meanAverrage);
          this.chart.redraw();
        }
        if (obsMedian.length > 0 && typeof medianSeries != 'undefined') {
          medianSeries.setData(obsMedian);
          this.chart.redraw();
        }
        if (stdDevRange.length > 0 && typeof stdDevSeries != 'undefined') {
          stdDevSeries.setData(stdDevRange);
          this.chart.redraw();
        }
        if (minMaxRange.length > 0 && typeof minMaxSeries != 'undefined') {
          minMaxSeries.setData(minMaxRange);
          this.chart.redraw();
        }
      }
      //this.chart.reflow();
    }
  }

  protected renderObservations(device: DeviceStruct): void {
    if (
      !this.chart ||
      !this.graphicOptions ||
      !device ||
      !device._selectedObservations
    ) {
      return;
    }
    Object.keys(device._selectedObservations).forEach((m) =>
      this.renderObservation(device, device._selectedObservations[m])
    );
  }

  protected renderDevices(): void {
    if (!this.chart || !this.graphicOptions || !this.graphicOptions.devices) {
      return;
    }
    Object.keys(this.graphicOptions.devices).forEach((m) =>
      this.renderObservations(this.graphicOptions.devices[m])
    );
  }

  setChartOptions() {
    let data: any[] = [];
    var options = {
      legend: {
        enabled: true,
        padding: 0,
        align: 'center',
      },
      credits: {
        enabled: false,
      },
      title: {
        text: '',
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
      yAxis: [],
      series: []
    };

    this.graphicOptions.options = Object.assign(
      options,
      this.graphicOptions.options || {}
    );
  }

  public clearSeries(): void {
    if (!this.chart) {
      return;
    }
    this.chart.series.forEach((m) => m.setData([]));
  }

  public addDeviceObservation(device: any, observation: any): void {
    /* add device and observation if they already weren't. and retreive them by their reference.. */
    device =
      (this.graphicOptions.devices = this.graphicOptions.devices || {})[
      device.MID
      ] || (this.graphicOptions.devices[device.MID] = device);
    observation =
      (device._selectedObservations = device._selectedObservations || {})[
      observation.Id
      ] || (device._selectedObservations[observation.Id] = observation);

    this.renderObservation(device, observation);
  }

  public removeDeviceObservation(device: any, observation: any): void {
    /* skip if device was not found ...*/
    if (
      !(device = (this.graphicOptions.devices =
        this.graphicOptions.devices || {})[device.MID])
    ) {
      return;
    }

    /* if observation is found.  */
    if (
      (observation = (device._selectedObservations =
        device._selectedObservations || {})[observation.Id])
    ) {
      /* unsubscribing all observation observers ... */
      var subscriptions =
        this.subscriptions[observation._seriesId || null] || null;
      if (subscriptions) {
        subscriptions.forEach((m) => m.unsubscribe());
        delete this.subscriptions[observation._seriesId];
      }

      /* removing series and yaxis ...  */
      var series = !observation._seriesId
        ? null
        : this.chart.get(observation._seriesId);
      if (series) {
        var yaxis = this.chart.get(series.yAxis.options.id);
        series.remove();
        if (yaxis && !yaxis.series.length) {
          yaxis.remove();
        }
      }
      /* deleteing observation ... */
      delete device._selectedObservations[observation.Id];
    }
    /* remove device also, if no observations remain... */
    if (!Object.keys(device._selectedObservations).length) {
      delete this.graphicOptions.devices[device.MID];
    }
  }

  ngOnDestroy(): void {
    Object.keys(this.graphicOptions.devices || {}).forEach((m) => {
      Object.keys(
        this.graphicOptions.devices[m]._selectedObservations || {}
      ).forEach((n) =>
        this.removeDeviceObservation(
          this.graphicOptions.devices[m],
          this.graphicOptions.devices[m]._selectedObservations[n]
        )
      );
    });
  }
}
