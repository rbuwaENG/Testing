import {
  Component,
  OnInit,
  ViewContainerRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  DeviceService,
  LoggerService,
  AppSettings,
  TemplateService,
  SiteSetting,
} from '../../services';
import { DataConvertion } from './../../common/dataconvertion';
import { GRADIENT_COLORS, LocalStorageKeys } from '../../core/constants';
import { templateAnalyzerText as text } from '../../core/constants/template-analyzer-text';
import { MapType, MapLayer } from '../../core/enums';
import { DeviceMapReasonsInfo } from '../../core/constants/device-map-reasons';
import { ColorGradientExtension, StringExtension } from '../../core/extensions';
import { TemplateAnalyzerMasterComponent } from '../template-analyzer-master.component';
import { Router } from '@angular/router';
import { LocalStorageService } from '../../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { DeviceActivityColors } from 'src/app/core/constants/device-activity-colors';

declare var ol: any;
@Component({
  selector: 'app-devices-map',
  templateUrl: './devices-map.component.html',
  styleUrls: ['./devices-map.component.scss'],
})
export class DevicesMapComponent
  extends TemplateAnalyzerMasterComponent
  implements OnInit
{
  @ViewChild('map') mapElement: ElementRef;
  @ViewChild('popup') popupElement: ElementRef;
  isOpen: boolean = true;
  dataConversion = new DataConvertion();
  templates: any;
  templateId: any;
  observations = [];
  settings = [];
  selectedObservations = [];
  selectedSettings = [];
  mapOservations = [];
  checkedObservations = [];
  allDevices: any;
  @ViewChild('optionsnav') sideNav: any;
  text = text;
  markerSource: any;
  map: any;
  popup: any;
  layer: any;
  reasons: any;
  legendItems: any;
  showlegend: boolean;
  isLoading: boolean = true;
  isMobile: boolean = false;
  pointFeatures: any[];
  isMultiple: boolean = false;
  mappedObservations = [];
  isSelectorsEnabled = false;

  //set offline duration
  offlineDurations = [
    { id: 0.0166667, name: '1 Minute' },
    { id: 0.16, name: '10 Minutes' },
    { id: 0.5, name: '30 Minutes' },
    { id: 1, name: '1 Hours' },
    { id: 2, name: '2 Hours' },
    { id: 6, name: '6 Hours' },
    { id: 12, name: '12 Hours' },
    { id: 24, name: '1 Day' },
    { id: 48, name: '2 Days' },
  ];
  durationId;
  fieldList = [
    { value: 'mid', viewValue: 'MID' },
    { value: 'name', viewValue: 'Name' },
  ];
  selectedFieldByDefault;
  showDeviceName = false;
  showDeviceMid = true;
  selectedFields = [];

  constructor(
    appSettings: AppSettings,
    loggerService: LoggerService,
    deviceService: DeviceService,
    protected viewContainerRef: ViewContainerRef,
    private templateService: TemplateService,
    protected siteSetting: SiteSetting,
    private router: Router,
    protected cache: LocalStorageService,
    protected dbService: NgxIndexedDBService
  ) {
    super(appSettings, loggerService, deviceService);
    this.isLoading = false;
    this.legendItems = DeviceMapReasonsInfo.reasons;
    this.reasons = DeviceMapReasonsInfo.reasons;
    this.showlegend = true;
    this.pointFeatures = [];
    // toggle map types whenever changes happen
    this.siteSetting.mapType.valueChanges.subscribe((type: MapType) =>
      this.toggleMapLayers(this.map, type)
    );

    // check the device and show the map accordingly
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      this.isMobile = true;
    }
  }

  ngOnInit() {
    this.isLoading = true;
    this.durationId = this.offlineDurations[7].id;
    //this.selectedFieldByDefault = this.fieldList[0];
    this.selectedFieldByDefault = [{ value: 'mid', viewValue: 'MID' }];
    this.selectedFields = ['mid'];
    this.showDeviceMid = true;
    this.showDeviceName = false;
    // this.initializeMap();
    this.isOpen = true;
    let templates = JSON.parse(
      localStorage.getItem(LocalStorageKeys.CACHED_TEMPLATES)
    );
    if (templates == null) {
      this.getAllTemplates();
    } else {
      this.templates = templates.sort((a: any, b: any) =>
        a.Id.localeCompare(b.Id)
      );
    }
    this.isLoading = false;
  }

  /**
   * Compare two options of multiple checkbox selector
   */
  comparer(o1, o2): boolean {
    // if possible compare by object's name, and not by reference.
    return o1 && o2 ? o1.name === o2.name : o2 === o2;
  }

  /**
   * Handles fields display selector
   * @param event
   */
  fieldShowChange(event) {
    if (event.isUserInput) {
      if (!this.selectedFields.includes(event.source.value)) {
        this.selectedFields.push(event.source.value);
      } else {
        var index = this.selectedFields.indexOf(event.source.value);
        if (index > -1) {
          this.selectedFields.splice(index, 1);
        }
      }
      if (this.mappedObservations.length > 0) {
        this.resetAnalyzerTable();
        this.mapDeviceObservations(this.mappedObservations);
      } else {
        this.resetAnalyzerTable();
        let request = this.getRequest();
        this.getSnapshotValues(request);
      }
    }
  }

  /**
   * Handles offline duration selector
   * @param event
   */
  OnDurationSelect(event) {
    this.durationId = event;
    let request = this.getRequest();
    this.getSnapshotValues(request);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeMap();
    }, 3000);
  }

  initializeMap() {
    this.markerSource = new ol.source.Vector({ wrapX: false });

    this.layer = new ol.layer.Vector({
      source: this.markerSource,
      style: (f, r) => this.styleFunction(f, r),
    });

    let view = new ol.View({
      center: ol.proj.fromLonLat([5.73271, 58.96564]),
      zoom: 5,
    });

    this.map = new ol.Map({
      layers: [this.layer],
      view: view,
    });

    /// add geo location features to show the location if user give permissions start ///
    var geolocation = new ol.Geolocation({
      tracking: true,
      projection: view.getProjection(),
    });

    var positionFeature = new ol.Feature();
    positionFeature.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({
            color: '#3399CC',
          }),
        }),
      })
    );

    geolocation.on('change:position', function () {
      let coordinates = geolocation.getPosition();
      positionFeature.setGeometry(
        coordinates ? new ol.geom.Point(coordinates) : null
      );
      view.setCenter(coordinates);
      localStorage.setItem('currentCoordinates', coordinates);
    });

    //check if currentCoordinates are set to local storage or not
    let currentCoordinates = localStorage.getItem('currentCoordinates');
    if (currentCoordinates != null) {
      var currentPosition = currentCoordinates.split(',').map(function (x) {
        return parseFloat(x);
      });
      positionFeature.setGeometry(new ol.geom.Point(currentPosition));
      view.setCenter(currentPosition);
    }

    this.markerSource.addFeature(positionFeature);

    /// add geo location features to show the location if user give permissions end ///

    // add tile layer to support map switching
    this.toggleMapLayers(this.map, this.siteSetting.mapType.getValue());

    // add select interaction for single-click
    this.map.addInteraction(this.getOnClickInteraction());
    // add select interaction for on hover
    this.map.addInteraction(this.getOnHoverInteracion());

    // overlay/popup that will show on mouse hover
    this.popup = new ol.Overlay({
      element: this.popupElement.nativeElement,
      offset: [10, 10],
    });
    this.map.addOverlay(this.popup);
    this.map.setTarget(this.mapElement.nativeElement);
  }

  // add layer styles
  private getLayerStyle(highlighted = false, color): any {
    let imageRadius = highlighted ? 7 : 5;
    let strokeWidth = highlighted ? 2 : 1.5;

    let style = new ol.style.Style({
      image: new ol.style.Circle({
        radius: imageRadius,
        fill: new ol.style.Fill({
          color: color,
          width: strokeWidth,
        }),
        stroke: new ol.style.Stroke({
          color: color,
          width: strokeWidth,
        }),
      }),
      stroke: new ol.style.Stroke({
        color: color,
        width: strokeWidth,
      }),
      text: new ol.style.Text({
        font: 'bold 11px Muli, "Helvetica Neue", Helvetica, sans-serif',
        offsetY: -15, // 0
        textAlign: 'left',
        placement: 'point',
        fill: new ol.style.Fill({
          color: '#000',
        }),
        stroke: new ol.style.Stroke({
          color: '#FFF',
          width: 2,
        }),
      }),
    });
    return style;
  }

  // add details when hovering over points
  getOnHoverInteracion(): any {
    let select = new ol.interaction.Select({
      condition: ol.events.condition.pointerMove,
      style: (f, r) => this.interactionStyleFunction(f, r),
    });
    select.on('select', (event) => {
      if (event.selected.length > 0) {
        let features = event.target.getFeatures().getArray();
        let feature = features[0];
        let data = feature.get('data');

        // change cursor to pointer
        this.mapElement.nativeElement.style.cursor = 'pointer';

        // show popup
        if (data) {
          this.popup.setPosition(event.mapBrowserEvent.coordinate);
          this.popupElement.nativeElement.style.display = '';
          this.popupElement.nativeElement.innerHTML = `<table style="border-collapse: collapse; padding: 5px;" class="inner-popup-table">
            <tr>
              <th style="border:1px solid black;padding: 5px; text-align: left;">Data</th>
              <th style="border:1px solid black;padding: 5px; text-align: left;">Value</th>
            </tr>
            <tr>
              <td style="border:1px solid black;padding: 5px;">Observation</td>
              <td style="border:1px solid black;padding: 5px;">${data.ObservationName}</td>
            </tr>
            <tr>
              <td style="border:1px solid black;padding: 5px;">MID</td>
              <td style="border:1px solid black;padding: 5px;">${data.MID}</td>
            </tr>
              <tr>
              <td style="border:1px solid black;padding: 5px;">Name</td>
              <td style="border:1px solid black;padding: 5px;">${data.Name}</td>
            </tr>
              <tr>
              <td style="border:1px solid black;padding: 5px;">Longitude</td>
              <td style="border:1px solid black;padding: 5px;">${data.Longitude}</td>
            </tr>
              <tr>
              <td style="border:1px solid black;padding: 5px;">Latitude</td>
              <td style="border:1px solid black;padding: 5px;">${data.Latitude}</td>
            </tr>
              <tr>
              <td style="border:1px solid black;padding: 5px;">Latest Pulse</td>
              <td style="border:1px solid black;padding: 5px;">${data.LatestPulse} hours ago</td>
            </tr>
          </table>`;
        }
        // show current location if hover over the point
        else {
          this.popup.setPosition(event.mapBrowserEvent.coordinate);
          this.popupElement.nativeElement.style.display = '';
          this.popupElement.nativeElement.innerHTML = `<span>I'm Here</span><br/>`;
        }
      } else if (event.deselected.length > 0) {
        // reset cursor
        this.mapElement.nativeElement.style.cursor = '';
        // hide popup
        this.popupElement.nativeElement.style.display = 'none';
      }
    });
    return select;
  }

  getOnClickInteraction(): any {
    let select = new ol.interaction.Select();
    select.on('select', (event) => {
      if (event.selected.length > 0) {
        let features = event.target.getFeatures().getArray();
        let feature = features[0];
        let data = feature.get('data');
        this.router.navigate([`devices/general/${data.MID}`]);
      }
    });
    return select;
  }

  // add style function when we zoom the map
  styleFunction(feature: any, resolution) {
    let style = this.getLayerStyle(false, feature.get('color'));
    style.getText().setText(resolution < 19 ? feature.get('name') : '');
    return style;
  }

  // add interaction style if we zoom it
  interactionStyleFunction(feature: any, resolution) {
    let style = this.getLayerStyle(true, feature.get('color'));
    style.getText().setText(resolution < 19 ? feature.get('name') : '');
    return style;
  }

  getAllTemplates() {
    this.templateService.getTemplates().subscribe(
      (data) => {
        this.templates = data.sort((a: any, b: any) =>
          a.Id.localeCompare(b.Id)
        );
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting templates failed...!!!');
      }
    );
  }

  onTemplateSelect() {
    this.clearAllValues();
    this.getTemplateDetailsById();
  }

  getTemplateDetailsById() {
    this.templateService.getTemplateDetails(this.templateId).subscribe(
      (data) => {
        this.observations = data.Observations.filter((x) => x.DataType == 5);
        this.isMultiple = this.observations.length > 1;
        this.settings = data.Settings;
        this.observations.forEach((element) => {
          element.DataType = this.dataConversion.convertDataTypes(
            element.DataType
          );
          element['IsEnable'] = false;
        });
        this.settings.forEach((element) => {
          element.DataType = this.dataConversion.convertDataTypes(
            element.DataType
          );
          element['IsEnable'] = false;
        });
      },
      (error) => {
        this.loggerService.showErrorMessage(
          'Getting template details failed...!!!'
        );
      }
    );
  }

  onCheckObservationsEvent(event, row, rowIndex) {
    this.checkedObservations[rowIndex] = event;
    if (this.selectedObservations != null) {
      if (event) {
        this.selectedObservations.push(row.Id);
      } else {
        this.selectedObservations = this.selectedObservations.filter(
          (item) => item !== row.Id
        );
      }
    }
  }

  plotDevice() {
    this.isLoading = true;
    this.isSelectorsEnabled = true;
    this.resetAnalyzerTable();
    if (!this.isMultiple)
      this.selectedObservations.push(this.observations[0].Id);
    if (this.selectedObservations.length > 0) {
      this.getDevicesAndMids();
    } else {
      this.loggerService.showWarningMessage(
        DeviceMapReasonsInfo.NoObservations
      );
      this.isLoading = false;
      this.isSelectorsEnabled = false;
    }
  }

  //add device points for selected observation of the selected template
  public addDevicePoints(devicePoints: any[]): void {
    for (let point in devicePoints) {
      this.addDevicePoint(devicePoints[point]);
    }
  }

  getInterpolatedColorBasedOnPulse(pulseHours) {
    let percent = '';
    if (pulseHours != null) {
      if (pulseHours > 24) {
        percent = this.calculateLinerColor(pulseHours, 24);
      } else if (pulseHours == '') {
        percent = this.calculateLinerColor(24, 24);
      } else if (pulseHours <= 2) {
        percent = this.calculateLinerColor(pulseHours, 2);
      } else if (pulseHours > 2 && pulseHours <= 24) {
        percent = this.calculateLinerColor(pulseHours, 24);
      } else {
        percent = this.calculateLinerColor(24, 24);
      }
    }

    return percent;
  }

  calculatePercentage(pulseHours, min = 0, max = 24) {
    let percent = 0;
    percent = ((pulseHours - min) * 100) / (max - min);
    return percent;
  }

  calculateLinerColor(currentValue, maxValue) {
    let r = (255 * currentValue) / maxValue;
    let g = (255 * (maxValue - currentValue)) / maxValue;
    let b = 0;

    return 'rgb(' + r + ',' + g + ',0)';
    //let r = percent<max ? 255 : Math.floor(255-(percent*2-100)*255/100);
    //let g = percent>max ? 255 : Math.floor((percent*2)*255/100);
    //return 'rgb('+r+','+g+',0)';
  }

  addDevicePoint(devicePoint: any): void {
    let pointName = '';
    this.showDeviceMid = false;
    this.showDeviceName = false;
    if (this.selectedFields.length == 0) {
      this.showDeviceMid = false;
      this.showDeviceName = false;
      pointName = ' ';
    }
    this.selectedFields.forEach((value) => {
      if (value == 'mid') {
        this.showDeviceMid = true;
      }
      if (value == 'name') {
        this.showDeviceName = true;
      }
    });

    if (this.showDeviceMid) {
      pointName = ' ';
      pointName = devicePoint.MID;
    }
    if (this.showDeviceName) {
      pointName = ' ';
      pointName = devicePoint.DeviceName;
    }
    if (this.showDeviceMid && this.showDeviceName) {
      pointName = ' ';
      pointName = devicePoint.MID + '-' + devicePoint.DeviceName;
    }
    let points = [];

    let min = 0;
    let max = this.durationId;
    let range = 0;
    range = max - min;

    let valueRatio0To1 =
      range == 0 ? 0 : (devicePoint.LatestPulse - min) / range;
    if (valueRatio0To1 > 1) {
      valueRatio0To1 = 1;
    }
    let linecolor = GRADIENT_COLORS[6];
    let color = ColorGradientExtension.pickColor(linecolor, valueRatio0To1);
    // let color = this.getInterpolatedColorBasedOnPulse(devicePoint.LatestPulse); //'rgb(255,102,0)';//devicePoint.LastStatus;
    let pointFeature = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.transform(
          [devicePoint.Position.Longitude, devicePoint.Position.Latitude],
          'EPSG:4326',
          'EPSG:3857'
        )
      ),
      name: pointName,
      color: color,
      data: this.getMapPoint(devicePoint),
    });

    this.markerSource.addFeature(pointFeature);

    // add to array to remove when other observations selected
    this.pointFeatures.push(pointFeature);

    points.push([
      devicePoint.Position.Longitude,
      devicePoint.Position.Latitude,
    ]);
    this.zoomToExtent();
    this.isLoading = false;
  }

  // create object to add displaying data for each features
  getMapPoint(devicePoint: any) {
    let point = {
      Longitude: devicePoint.Position.Longitude,
      Latitude: devicePoint.Position.Latitude,
      Altitude: devicePoint.Position.Altitude,
      MID: devicePoint.MID.toString(),
      Name: devicePoint.DeviceName,
      ObservationName: this.observations.filter(
        (x) => x.Id == devicePoint.ObservationId
      )[0].Name,
      LatestPulse: devicePoint.LatestPulse,
    };
    return point;
  }

  //Define map zoom to the location
  private zoomToExtent(): void {
    if (this.markerSource) {
      let extent = this.markerSource.getExtent();
      this.map.getView().fit(extent, { size: this.map.getSize(), maxZoom: 14 });
      this.map.updateSize();
    }
  }

  getDevicesAndMids() {
    this.dbService.count('devices').subscribe((recordCount) => {
      if (recordCount == 0) {
        this.deviceService
          .getDeviceMetaAndDeviceData('false', 'true')
          .subscribe((devices) => {
            // this.updateDeviceList(devices);
            //insert devices into IDB
            this.dbService
              .add('devices', {
                Value: devices,
              })
              .subscribe((storeData) => {
                this.dbService.getAll('devices').subscribe((devices) => {
                  if (devices[0].Value != null) {
                    this.allDevices = devices[0].Value;
                    let request = this.getRequest();
                    if (
                      request.ObservationIds.length == 0 &&
                      request.SettingIds.length == 0
                    ) {
                      this.loggerService.showWarningMessage(
                        DeviceMapReasonsInfo.NoObservations
                      );
                      this.isLoading = false;
                    } else if (request.MIDs.length == 0) {
                      this.loggerService.showWarningMessage(
                        DeviceMapReasonsInfo.NoDevices
                      );
                      this.isLoading = false;
                    } else {
                      this.sideNav.close();
                      this.getSnapshotValues(request);
                    }
                  }
                });
              });
          });
      } else {
        this.dbService.getAll('devices').subscribe((devices) => {
          if (devices[0].Value != null) {
            this.allDevices = devices[0].Value;
            let request = this.getRequest();
            if (
              request.ObservationIds.length == 0 &&
              request.SettingIds.length == 0
            ) {
              this.loggerService.showWarningMessage(
                DeviceMapReasonsInfo.NoObservations
              );
              this.isLoading = false;
            } else if (request.MIDs.length == 0) {
              this.loggerService.showWarningMessage(
                DeviceMapReasonsInfo.NoDevices
              );
              this.isLoading = false;
            } else {
              this.sideNav.close();
              this.getSnapshotValues(request);
            }
          }
        });
      }
    });
  }

  // create api request
  getRequest(): any {
    let mids = this.getDevicesByTemplateId(this.templateId);
    let observations = this.selectedObservations;
    let settings = this.selectedSettings;
    let request = {
      MIDs:
        // [
        //   //'CBF00413',
        //   //'CBE00218',
        //   //'CBE00110',
        //   //'CBE00111',
        //   'CBF00417'
        // ],
        mids.MIDS,
      ObservationIds: observations,
      SettingIds: settings,
    };
    return request;
  }
  n;

  getDevicesByTemplateId(templateId: string): any {
    let devices = [];
    let mids = [];
    //get all devices from local storage or global variable for mapping with the template
    // this.allDevices = this.cache.getAllDevices();
    // if (this.allDevices == null) {
    //   //get all devices by API
    //   this.getAllDevices();
    // }
    if (this.allDevices != null) {
      this.allDevices.forEach((element) => {
        if (templateId == element.TemplateId) {
          let device = {};
          mids.push(element.MID);
          device['MID'] = element.MID;
          device['Name'] = element.Name;
          devices.push(device);
        }
      });
    }
    devices['MIDS'] = mids;
    return devices;
  }

  getSnapshotValues(request: any) {
    this.deviceService.getSnapshot(request).subscribe(
      (data) => {
        this.mapDeviceObservations(data.filter((x) => x.Observations != null));
        this.mappedObservations = data.filter((x) => x.Observations != null);
      },
      (error) => {
        this.loggerService.showErrorMessage(
          'Getting snapshot values failed...!!!'
        );
      }
    );
  }

  mapDeviceObservations(data: any) {
    let mapOservations = [];
    data.forEach((element) => {
      element.Observations.forEach((obs) => {
        let coordinates = obs.Value.split(',');

        if (!isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
          let position = {
            Longitude: Number(coordinates[1]),
            Latitude: Number(coordinates[0]),
            Altitude: Number(coordinates[2]),
          };
          let deviceData = this.getDeviceByMid(element.MID);
          mapOservations.push({
            MID: element.MID,
            DeviceName: deviceData.Name,
            LastStatus: deviceData.lastDeviceStatus,
            Timestamp: obs.Timestamp,
            Position: position,
            ObservationId: obs.Id,
            LatestPulse: deviceData.LatestPulse,
          });
        }
      });
    });
    //this.mappedObservations = mapOservations;
    this.addDevicePoints(mapOservations);
  }

  /** Old Implementation */
  getDevicesByTemplateIds(templateId: string): any {
    let devices = [];
    let mids = [];
    //get all devices from local storage or global variable for mapping with the template
    this.allDevices = this.cache.getAllDevices();
    if (this.allDevices == null) {
      //get all devices by API
      this.getAllDevices();
    }
    if (this.allDevices != null) {
      this.allDevices.forEach((element) => {
        if (templateId == element.TemplateId) {
          let device = {};
          mids.push(element.MID);
          device['MID'] = element.MID;
          device['Name'] = element.Name;
          devices.push(device);
        }
      });
    }
    devices['MIDS'] = mids;
    return devices;
  }

  getDeviceByMid(mid: string): any {
    return this.arrangeDevicewithDeviceColor(mid);
  }

  arrangeDevicewithDeviceColor(mid) {
    this.allDevices = this.arrangeDeviceList(this.allDevices);
    let device = this.allDevices.filter((item) => item.MID == mid);
    return device[0];
  }

  getAllDevices() {
    this.deviceService.getDevices().subscribe(
      (data) => {
        let devices = this.arrangeDeviceList(data);
        this.cache.createDeviceLocalStorage(devices);
        this.allDevices = devices;
      },
      (error) => {
        this.loggerService.showErrorMessage('Getting all devices failed...!!!');
      }
    );
  }

  private arrangeDeviceList(devices) {
    //log(devices);
    devices.forEach((device, deviceIndex) => {
      if (device.LatestPulse != null) {
        // return device['lastDeviceStatus'] = this.getDeviceStatus(device.LatestPulse);
        let pulseColor = this.getDeviceStatus(device.LatestPulse);
        device['lastDeviceStatus'] = pulseColor;
        if (pulseColor == DeviceActivityColors.GREEN) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: less than 2 hours ago';
        } else if (pulseColor == DeviceActivityColors.AMBER) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: between 2 and 24 hours ago';
        } else if (pulseColor == DeviceActivityColors.RED) {
          device['lastDevicePulseTime'] =
            'Last Device Pulse: more than 1 day ago';
        } else {
          device['lastDevicePulseTime'] = 'Last Device Pulse: never';
        }
        return device;
      } else {
        // return device['lastDeviceStatus'] = this.getDeviceStatus();
        device['lastDeviceStatus'] = this.getDeviceStatus();
        device['lastDevicePulseTime'] = 'Last Device Pulse: never';
        return device;
      }
    });
    return devices;
  }

  private getDeviceStatus(pulseHours = null) {
    let color = DeviceActivityColors.GRAY;

    if (pulseHours != null) {
      if (pulseHours > 24) {
        color = DeviceActivityColors.RED;
      } else if (pulseHours == '') {
        color = DeviceActivityColors.GRAY;
      } else if (pulseHours <= 2) {
        color = DeviceActivityColors.GREEN;
      } else if (pulseHours > 2 && pulseHours <= 24) {
        color = DeviceActivityColors.AMBER;
      } else {
        color = DeviceActivityColors.GRAY;
      }
    }
    return color;
  }

  clearAllValues() {
    this.selectedObservations = [];
    this.selectedSettings = [];
    this.mapOservations = [];
    this.observations = [];
    this.checkedObservations = [];
  }

  resetAnalyzerTable() {
    this.mapOservations = [];
    // remove existing features before adding new features
    if (this.pointFeatures.length != 0) {
      this.pointFeatures.forEach((feature) => {
        this.markerSource.removeFeature(feature);
      });
    }
    this.pointFeatures = [];
  }

  /**
   * Retreives the layer from the map. Also adds it into the map, if its missing ...
   * @param map map owning the layers....
   * @param layer layer type to retreive ....
   */
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
            wrapX: true,
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
            wrapX: true,
          })
        );
        break;
      case MapLayer.BingAerial:
      case MapLayer.BingAerialWithLabels:
        resultLayer.setZIndex(-1);
        resultLayer.setSource(
          new ol.source.BingMaps({
            key: this.appSettings.bing_maps_token,
            imagerySet:
              layer === MapLayer.BingAerial ? 'Aerial' : 'AerialWithLabels',
            wrapX: true,
          })
        );
        break;

      case MapLayer.OsmOpenSea:
        resultLayer.setZIndex(0);
        resultLayer.setSource(
          new ol.source.XYZ({
            crossOrigin: null,
            url: 'https://t1.openseamap.org/seamark/{z}/{x}/{y}.png', //'http://t1.openseamap.org/seamark/{z}/{x}/{y}.png',
            wrapX: true,
          })
        );
        break;
    }

    map.addLayer(resultLayer);
    return resultLayer;
  }

  /**
   * Toggling map-tile-layer's visibility ...
   * @param map map owning the layers....
   * @param selectedMapType the selected map-type against which the layer(s) should be toggled ...
   */
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
}
