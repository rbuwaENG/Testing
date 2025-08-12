import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { DateExtension, StringExtension } from 'src/app/core/extensions';
import {
  AppSettings,
  DeviceService,
  LiveConnectionService,
  LoggerService,
  ObservationService,
  SiteSetting,
  TemplateService,
} from 'src/app/services';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceStatusColorGenerator } from 'src/app/core/helpers/device-color-generator.helper';
import * as moment from 'moment';
import { LiveConnectRequest, WebSocketSubscriber } from 'src/app/core/models';
import { catchError, startWith } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { MapLayer, MapType } from 'src/app/core/enums';
import { DashboardService } from 'src/app/services/dashboard.service';
import Highcharts from 'highcharts';
import { darkTheme, lightTheme } from 'src/assets/highcharts/highchartsthemes';
import { ThemeStyles } from 'src/app/core/constants/theme-styles-constants';
import { NumberConstants } from 'src/app/core/constants/number.constants';
import { EnumerationGroupDetails, EnumerationItem } from 'src/app/core/interfaces/template-enumeration.interface';
import { LocalStorageService } from 'src/app/services/local-storage.service';
declare var ol: any;

@Component({
  selector: 'app-view-dashboard',
  templateUrl: './view-dashboard.component.html',
  styleUrls: ['./view-dashboard.component.scss'],
})
export class ViewDashboardComponent implements OnInit, OnDestroy {
  public options: any;
  public statOptions: any;
  public charts: any[];
  dashboardId: any;
  TID: any;
  MID: any;
  selectedDashboard: any;
  selectedObservations = [];
  selectedTemplate: any;
  selectedTemplateObservations = [];
  observations: Array<any> = [];
  mapObservations = [];
  tableObservations = [];
  selected = [];
  dashboardChanged: boolean = false;
  dashboardReset: boolean = false;
  deviceStatusColor;
  dashboardName: any = 'Dashboards';
  listOfDashboards: any;
  isLive: boolean = false;
  templateUnits: any;
  public webSocketSubscriber: WebSocketSubscriber;
  deviceDetails: any;
  selectedDashboardValue: any;
  isLiveConnectionEnable: boolean;
  columns: number = 0;
  rows: number = 0;
  rowHeight: string = '';
  windowHeight: number = 0;
  shiftCount: number = 10;
  connectionAttempts: number = 0;
  reconnectionCount: number = 0;
  enumGroups: EnumerationGroupDetails[] = [];
  enumItems: EnumerationItem[] = [];

  controlTypes = [
    { id: 0, name: 'Table' },
    { id: 1, name: 'Plot' },
    { id: 2, name: 'Map' },
  ];

  //Map related
  maps = [];
  trackStyle: any;
  public readonly TrackStrokeColor = 'rgba(0,0,0,0.5)';

  constructor(
    private observationService: ObservationService,
    private router: Router,
    private loggerService: LoggerService,
    private route: ActivatedRoute,
    private deviceService: DeviceService,
    private templateService: TemplateService,
    private liveConnectionService: LiveConnectionService,
    private settings: AppSettings,
    protected siteSettings: SiteSetting,
    private dashboardService: DashboardService,
    private changeDetector: ChangeDetectorRef,
    protected cache: LocalStorageService
  ) {
    this.dashboardId = this.route.snapshot.params['dashboardId'];
    this.MID = this.route.snapshot.params['deviceId'];
    this.webSocketSubscriber = new WebSocketSubscriber(
      this.settings,
      this.liveConnectionService
    );

    /**Handles url navigation on same url**/
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };

    this.siteSettings.trackStyle.valueChanges.subscribe((trackStyle: any) => {
      this.trackStyle = trackStyle;
    });
  }

  ngOnInit() {
    this.windowHeight = window.innerHeight;
    this.options = this._getChartOptions();
    this.statOptions = this._getStatChartOptions();
    this.charts = [];
    this.getDeviceDetailsAndUnits();
    this.siteSettings.themeType.valueChanges
    .pipe(startWith(this.siteSettings.themeType.getValue()))  
    .subscribe((theme) => {
      let currentTheme = (ThemeStyles.darkMode === theme) ? darkTheme : lightTheme;
      this.charts.forEach(chart => {
        chart.chart.update(currentTheme);
      });
      Highcharts.setOptions(currentTheme);
    });
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.windowHeight = window.innerHeight;
    this.rowHeight = this._getGridTileRowHeight(this.windowHeight, this.rows);
  }

  //End of map region
  ngOnDestroy(): void {
    if (this.isLive) {
      this.webSocketSubscriber.disconnect();
    }
  }

  ngDoCheck() {
    this.charts.forEach((chart) => {
      chart.chart.reflow();
    });
  }

  getDeviceDetailsAndUnits() {
    let deviceDetails = this.deviceService
      .getDeviceDetails(this.MID)
      .pipe(catchError((error) => of(error)));
    let templateUnits = this.templateService
      .getUnits()
      .pipe(catchError((error) => of(error)));

    forkJoin([deviceDetails, templateUnits]).subscribe((data) => {
      if (data != null) {
        this.deviceDetails = data[0];
        this.TID = data[0]['TemplateId'];
        this.templateUnits = data[1]['Quantities'];
        this.cache.updateDevice(data[0]);
        this.enumGroups = this.cache.getDeviceEnumerations(this.MID);
        this.getDashboardsByTemplateId(this.TID);
      }
    });
  }
  /**
   * Live connection
   */
  handleLiveConnectionChange(event) {
    this.handleLiveConnection(event.checked);
  }

  handleLiveConnection(isEnable: boolean) {
    this.isLive = false;
    this.disconnectLiveRequest();
    if (isEnable) {
      this.isLiveConnectionEnable = isEnable;
      let obsIds = this.observations.map((e) => e.Id);
      this.isLive = true;
      this.connectLiveServer(obsIds);
    }
  }

  disconnectLiveRequest() {
    this.webSocketSubscriber.disconnect();
  }

  public connectLiveServer(obsIds) {
    let option = new LiveConnectRequest();
    option.MID = this.MID;
    option.ObservationIds = obsIds;
    option.CommandIds = [0];

    if (this.webSocketSubscriber.isConnected) {
      this.webSocketSubscriber.disconnect();
    }

    let options = [];
    options.push(option);
    this.webSocketSubscriber
      .connect(options)
      .then(
        (value: any) => {
          this.reconnectionCount += 1;
          this.connectionAttempts = 0;
          console.log(
            `Connected to web socket. Connection count (${this.reconnectionCount})`
          );
          this.webSocketSubscriber.messageStream.subscribe(
            (message) => this.parseSocketMessageToData(message),
            (error) => this.onWebSocketError(error)
          );
        },
        (error: any) => {
          console.log(
            `Faild to Connect to web socket. Connection count (${this.reconnectionCount})`
          );
          this.isLiveConnectionEnable = false;
          this.isLive = false;
          this.loggerService.showErrorMessage(error);
          this.changeDetector.detectChanges();
          this.onWebSocketError(error);
        }
      )
      .catch((error: any) => {
        console.log(
          `Faild to Connect to web socket. Connection count (${this.reconnectionCount})`
        );
        this.isLiveConnectionEnable = false;
        this.isLive = false;
        this.loggerService.showErrorMessage(error);
        this.changeDetector.detectChanges();
        this.onWebSocketError(error);
      });
  }

  protected onWebSocketError(error: any) {
    //try 3 time to connect to the server
    if (this.connectionAttempts < 3) {
      this.connectionAttempts += 1;
      console.log(
        `Live connection is closed. Reconnect will be attempted (${this.connectionAttempts}) in 2 second. Error : ${error}`
      );
      let self = this;
      setTimeout(function () {
        self.isLiveConnectionEnable = false;
        self.isLive = false;
        self.handleLiveConnection(true);
      }, 2000);
    } else {
      console.log(
        `Live connection is closed. Could not reconnect. Error : ${error}`
      );
      this.isLiveConnectionEnable = false;
      this.isLive = false;
      this.changeDetector.detectChanges();
    }
  }

  protected parseSocketMessageToData(message: any): any {
    let splits = null;
    this.observations.forEach((observation, index) => {
      if (
        !(splits = message.headers.destination.split('/')).length ||
        (splits = splits[splits.length - 1].split('.')).length < 3 ||
        splits[0] != this.MID ||
        splits[splits.length - 1] != observation.Id
      ) {
        return null;
      }
      if (observation.ControlType == 'Plot') {
        this.onDataReceivedSuccessGeneratePlots(
          message.body,
          observation,
          index,
          true
        );
      } else if (observation.ControlType == 'Table') {
        let shift = observation['data']?.length >= this.shiftCount;
        if (shift) {
          observation['data'].shift();
          observation['data'].push(message.body);
        } else {
          observation['data'].push(message.body);
        }
        observation['data'] = [...observation['data']];
        this.changeDetector.detectChanges();
      }
    });
  }

  getDashboardsByTemplateId(tId: string) {
    this.dashboardService.getAllTemplateDashboards(tId).subscribe((res) => {
      if (res) {
        res.sort((f, n): number => {
          if (f.Index < n.Index) return -1;
          if (f.Index > n.Index) return 1;
          return 0;
        });
      }
      this.listOfDashboards = res;
      this.getDeviceObservations();
      this.getLatestPulse();
      if (this.selectedDashboard) {
        this.handleLiveConnection(this.selectedDashboard.IsLive);
      }
    });
  }

  getLatestPulse() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.MID).subscribe((data) => {
      if (data != null) {
        pulseTime = data.To;
      }
      this.handleDeviceColorCode(pulseTime);
    });
  }

  handleDeviceColorCode(pulseTime) {
    this.deviceStatusColor = DeviceStatusColorGenerator.getColorCode(
      pulseTime,
      'UTC'
    );
  }

  getDeviceObservations() {
    this.selectedTemplateObservations =
      this.deviceDetails['Metadata']['Observations'];
    this.selectDashboardAndObservations();
  }

  selectDashboardAndObservations() {
    this.selectedDashboard = this.listOfDashboards.find(
      (d) => d.Id == this.dashboardId
    );
    this.selectedDashboardValue = this.selectedDashboard['Id'];
    this.dashboardName = this.selectedDashboard['Name'];
    this.columns = this.selectedDashboard['Columns'];
    this.rows = this.selectedDashboard['Rows'];
    if (this.selectedDashboard['Observations']) {
      this.selectedObservations = this.selectedDashboard['Observations'];
      this.setChartCols();
    } else {
      this.dashboardReset = false;
      this.loggerService.showErrorMessage(
        "Selected dashboard doesn't contain any observations"
      );
      this.observations = [];
      this.selectedObservations = [];
    }
  }

  setChartCols() {
    this.selectedObservations.sort(function (a, b) {
      if (a['Placement']['Row'] > b['Placement']['Row']) {
        return 1;
      }
      if (a['Placement']['Row'] < b['Placement']['Row']) {
        return -1;
      }
      if (a['Placement']['Column'] > b['Placement']['Column']) {
        return 1;
      }
      if (a['Placement']['Column'] < b['Placement']['Column']) {
        return -1;
      }
      return 0;
    });
    this.rowHeight = this._getGridTileRowHeight(this.windowHeight, this.rows);
    this.arrangeObservationValuesTimeDuration();
  }

  arrangeObservationValuesTimeDuration() {
    this.selectedObservations.forEach((observation) => {
      let to = moment.utc();
      let from = moment.utc();
      let duration = observation['Timespan']['Duration'];

      observation.To = to.format('YYYY-MM-DDTHH:mm:ss');
      observation.From = from
        .add(-duration, 'seconds')
        .format('YYYY-MM-DDTHH:mm:ss');
    });

    this.selectedObservations = this.selectedObservations.map((a) => {
      const exists = this.selectedTemplateObservations.find(
        (b) => a.Id == b.Id
      );
      if (exists) {
        a.ObservationName = exists.Name;
        a.DataType = exists.DataType;
        a.Quantity = exists.Quantity;
        a.ControlType = this.controlTypes[a.Widget]['name'];
        a.Unit = 1;
      }
      return a;
    });

    this.selectedObservations.forEach((obs) => {
      obs.UnitName = '';
      if (obs.Quantity != 0) {
        let quantityUnits = this.templateUnits.find(
          (t) => t.Id == obs.Quantity
        )['Units'];
        if (quantityUnits != null) {
          obs.UnitName = quantityUnits.find((f) => f.Id == obs.Unit)['Name'];
          obs.UnitAbbreviation = quantityUnits.find((f) => f.Id == obs.Unit)[
            'Abbreviation'
          ];
        }
      }
    });
    this.initMap();
  }

  private initMap() {
    this.selectedObservations.forEach((obs) => {
      if (obs.ControlType == 'Map') {
        let lat = 4.69497580094886;
        let lon = -44.7197850546873;
        let zoomLevel = 3;
        var mapOne = new ol.Map({
          view: new ol.View({
            zoom: zoomLevel,
            center: ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857'),
          }),
        });

        this.toggleMapLayers(mapOne, this.siteSettings.mapType.getValue());
        this.setTrackStyle();
        let fillColor = null;
        if (this.trackStyle['strokeColor'] == this.TrackStrokeColor)
          fillColor = this.trackStyle['fillColor'];
        let lineStyle = this.setLineLayerStyle(
          this.trackStyle['strokeColor'],
          fillColor
        );
        let deviceStyle = this.setDeviceLayerStyle(
          this.trackStyle['fillColor'],
          this.trackStyle['strokeColor'],
          fillColor != null
        );
        /* add marker layer ... */
        mapOne.addOverlay(
          (mapOne._markerLayer = new ol.layer.Vector({
            style: deviceStyle,
            source: new ol.source.Vector({ wrapX: false }),
          }))
        );
        /* add popup layer ... */
        mapOne.addOverlay(
          (mapOne._popupLayer = new ol.Overlay({
            positioning: 'bottom-center',
          }))
        );

        this.maps.push(mapOne);
      }
    });
    this.arrangeObservationsBasedOnControlType();
  }

  setDeviceLayerStyle(fillColor, strokeColor, isBlackStroke = false) {
    return new ol.style.Style({
      image: new ol.style.Circle({
        radius: 4,
        fill: new ol.style.Fill({
          color: fillColor,
        }),
        stroke: new ol.style.Stroke({
          color: strokeColor,
          width: 2,
        }),
      }),
      stroke: new ol.style.Stroke({
        width: 1,
        color: !isBlackStroke ? strokeColor : fillColor,
      }),
    });
  }

  setLineLayerStyle(strokeColor, fillColor = null) {
    let styles;
    if (fillColor) {
      styles = [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            width: 5,
            color: strokeColor,
          }),
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            width: 3.5,
            color: fillColor,
          }),
        }),
      ];
    } else {
      styles = new ol.style.Style({
        stroke: new ol.style.Stroke({
          width: 1,
          color: strokeColor,
        }),
      });
    }
    return styles;
  }

  private setTrackStyle() {
    let trackStyle = this.siteSettings.trackStyle.getValue();
    if (!this.trackStyle) this.trackStyle = trackStyle;
  }

  protected toggleMapLayers(map: any, selectedMapType: MapType): void {
    this.getMapLayer(map, MapLayer.OsmDefault).setVisible(
      selectedMapType === MapType.Standard
    );
    this.getMapLayer(map, MapLayer.CartoLight).setVisible(
      selectedMapType === MapType.Grayscale
    );
    this.getMapLayer(map, MapLayer.BingAerial).setVisible(
      selectedMapType === MapType.Satellite
    );
    this.getMapLayer(map, MapLayer.BingAerialWithLabels).setVisible(
      selectedMapType === MapType.SatelliteWithLabels
    );
    this.getMapLayer(map, MapLayer.CartoDark).setVisible(
      selectedMapType === MapType.Dark
    );
  }

  protected getMapLayer(map: any, layer: MapLayer): any {
    /* 
        find iof there are any layer by the "_id", if YES return it ..
        Else create a layer, add it to the map, and then return it ...
        */
    var overlayerId = StringExtension.toSnakeCase(`mlayer_${MapLayer[layer]}`);
    var resultLayer = map
      .getLayers()
      .getArray()
      .find((m) => m.get('_id') == overlayerId);
    if (resultLayer) {
      return resultLayer;
    }

    resultLayer = new ol.layer.Tile({
      _id: overlayerId,
      visible: false,
      preload: Infinity,
    });

    switch (layer) {
      case MapLayer.OsmDefault:
        resultLayer.setZIndex(-1);
        resultLayer.setSource(new ol.source.OSM());
        break;

      case MapLayer.CartoLight:
        resultLayer.setZIndex(-1);
        resultLayer.setSource(
          new ol.source.XYZ({
            crossOrigin: null,
            url: 'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', //'http://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            attributions: [
              new ol.Attribution({
                html: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.',
                title: 'Attributions',
              }),
            ],
          })
        );
        break;
      case MapLayer.CartoDark:
        resultLayer.setZIndex(-1);
        resultLayer.setSource(
          new ol.source.XYZ({
            crossOrigin: null,
            url: 'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
            attributions: [
              new ol.Attribution({
                html: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.',
                title: 'Attributions',
              }),
            ],
            wrapX: false,
          })
        );
        break;
      case MapLayer.BingAerial:
      case MapLayer.BingAerialWithLabels:
        resultLayer.setZIndex(-1);
        resultLayer.setSource(
          new ol.source.BingMaps({
            key: this.settings.bing_maps_token,
            imagerySet:
              layer === MapLayer.BingAerial ? 'Aerial' : 'AerialWithLabels',
          })
        );
        break;

      case MapLayer.OsmOpenSea:
        resultLayer.setZIndex(0);
        resultLayer.setSource(
          new ol.source.XYZ({
            crossOrigin: null,
            url: 'https://t1.openseamap.org/seamark/{z}/{x}/{y}.png', //'http://t1.openseamap.org/seamark/{z}/{x}/{y}.png'
          })
        );
        break;
    }

    map.addLayer(resultLayer);
    return resultLayer;
  }

  arrangeObservationsBasedOnControlType() {
    this.observations = [];
    this.selectedObservations.forEach((obs) => {
      if (obs.ControlType == 'Plot') {
        obs[
          'Url'
        ] = `devices/${this.MID}/observations/${obs.Id}/${obs.ObservationName}/plot`;
        this.observations.push(obs);
      } else if (obs.ControlType == 'Table') {
        obs[
          'Url'
        ] = `devices/${this.MID}/observations/${obs.Id}/${obs.ObservationName}/table`;
        this.observations.push(obs);
      } else {
        obs[
          'Url'
        ] = `devices/${this.MID}/observations/${obs.Id}/${obs.ObservationName}/map`;
        this.observations.push(obs);
      }
    });
    this.getObservationValues();
  }

  navigateToSelectedDashboard() {
    this.router
      .navigateByUrl('devices/' + this.MID + '/dashboards', {
        skipLocationChange: true,
      })
      .then(() =>
        this.router.navigate([
          'devices/' + this.MID + '/dashboards/' + this.selectedDashboardValue,
        ])
      );
  }

  navigateToDashboardList() {
    this.router.navigateByUrl('devices/' + this.MID + '/dashboards');
  }

  navigateToDetailedObservation(obsUrl) {
    if (obsUrl != null) {
      this.router.navigateByUrl(obsUrl);
    } else {
      this.loggerService.showErrorMessage('Cannot navigate to detailed view');
    }
  }

  getObservationValues() {
    this.observations.forEach((obs, index) => {
      this.observationService
        .getObservationValues(
          this.MID,
          obs.Id,
          obs.From,
          obs.To,
          'User Defined'
        )
        .subscribe((data: any) => {
          data.sort();
          if (obs.ControlType == 'Plot') {
            this.onDataReceivedSuccessGeneratePlots(data, obs, index, false);
          } else if (obs.ControlType == 'Table') {
            const dataLength = data.length - 1;
            data[dataLength]['Selected'] = 'highlight-recent';
            obs['data'] = data;
          } else {
            this.onDataReceivedSuccessGenerateMaps(data, obs, index);
          }
        });
    });
  }

  onDataReceivedSuccessGenerateMaps(data, obs, index) {
    this.maps.forEach((map, i) => {
      map.setTarget(`map${index}`);
    });
  }

  protected onDataReceivedSuccessGeneratePlots(
    data: any | any[],
    observation: any,
    index: any,
    isLiveDataPoint: boolean
  ): void {
    let chart = this.charts.find((x) => x.id === index);
    let observationName = observation.ObservationName;
    let UnitAbbreviation = observation.UnitAbbreviation;

    if (observation.DataType === 7) {
      // stats
      data = (data instanceof Array ? data : [data]).map((elem) => [
        DateExtension.getTimestampAsMilliseconds(elem.Timestamp),
        elem.Value,
      ]);
    } else if (observation.DataType !== 2) {
      data = (data instanceof Array ? data : [data]).map((elem) => [
        DateExtension.getTimestampAsMilliseconds(elem.Timestamp),
        Number(parseFloat(elem.Value).toFixed(2)),
      ]);
    } else {
      data = (data instanceof Array ? data : [data]).map((elem) => [
        DateExtension.getTimestampAsMilliseconds(elem.Timestamp),
        Number(elem.Value),
      ]);
    }

    if (observation.DataType !== 7) {
      let series = chart.chart.series[0];
      let shift = series.data.length >= this.shiftCount;

      series.name = `${this.MID} - ${observationName} ${UnitAbbreviation ? `(${UnitAbbreviation})` : ""}`;
      data.forEach((m) =>
        series.addPoint(m, isLiveDataPoint, shift && isLiveDataPoint)
      ); // shift and redraw only for live data points not to initial data set
      if (observation.Quantity === NumberConstants.EnumerationGroupQuantityId) {
        let newCategories: string[] = [];
        this.enumItems = this.enumGroups.find((x) => x.Id === observation.Unit).Items;
        this.enumItems.forEach(item => newCategories.push(`${item.Id}/ ${item.Name}`));
        chart.chart.yAxis[0].update({ categories: newCategories }, true);
      }
    } else {
      // for stat plot
      let obsMedian = [];
      let stdDevRange = [];
      let minMaxRange = [];
      let meanAverrage = [];

      var meanSeries = chart.chart.series[0];
      var medianSeries = chart.chart.series[1];
      var stdDevSeries = chart.chart.series[2];
      var minMaxSeries = chart.chart.series[3];

      let statShift = meanSeries.data.length >= this.shiftCount;

      data.forEach((item) => {
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

      meanSeries.name = `(${observationName}) Mean`;
      meanAverrage.forEach((m) =>
        meanSeries.addPoint(m, isLiveDataPoint, statShift && isLiveDataPoint)
      );
      medianSeries.name = `(${observationName}) Median`;
      obsMedian.forEach((m) =>
        medianSeries.addPoint(m, isLiveDataPoint, statShift && isLiveDataPoint)
      );
      stdDevSeries.name = `(${observationName}) StdDev +/-`;
      stdDevRange.forEach((m) =>
        stdDevSeries.addPoint(m, isLiveDataPoint, statShift && isLiveDataPoint)
      );
      minMaxSeries.name = `(${observationName}) Min/Max`;
      minMaxRange.forEach((m) =>
        minMaxSeries.addPoint(m, isLiveDataPoint, statShift && isLiveDataPoint)
      );
    }
    if (!isLiveDataPoint) {
      chart.chart.redraw();
    }
    chart.chart.reflow();
  }

  public saveChart(chart: any, obsId: any, index: any) {
    let data = {
      id: index,
      obsId: obsId,
      chart: chart,
    };
    this.charts.push(data);
  }

  clearPlots() {
    this.charts = [];
    this.observations = [];
  }

  private _getGridTileRowHeight(
    windowHeight: number,
    rowNumber: number
  ): string {
    return `${(windowHeight - 165) / rowNumber}px`; // viewport height - (menubar height + breadcrumb height)
  }

  /**
   * Initialize charts
   * @param data
   */

  private _getChartOptions(data: any[] = []): any {
    return {
      chart: {
        type: 'line',
        zoomType: 'x',
        reflow: true,
        marginTop: 10,
        marginBottom: 40,
      },
      title: {
        text: '',
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        title: {
          text: 'Timestamp in UTC',
          style: {
            fontSize: '10px',
          },
        },
        type: 'datetime',
      },
      yAxis: {
        title: {
          text: '',
        },
        allowDecimals: true,
      },
      plotOptions: {
        line: {
          marker: {
            symbol: 'circle',
            radius: 2,
          },
          lineWidth: 1,
          color: '#007dbd',
        },
      },
      legend: {
        enabled: false,
      },
      series: [
        {
          name: 'Test',
          data: [],
        },
      ],
    };
  }

  private _getStatChartOptions(data: any[] = []): any {
    return {
      title: '',
      chart: {
        zoomType: 'x',
      },
      series: [
        {
          name: `test Mean`,
          data: data,
          showInLegend: false,
          zIndex: 1,
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
          name: `test Median`,
          data: data,
          zIndex: 1,
          showInLegend: false,
          fillOpacity: 0.5,
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
          name: `test StdDev +/-`,
          data: data,
          showInLegend: false,
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
          name: `test Min/Max`,
          data: data,
          showInLegend: false,
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
}
