import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter, ChangeDetectorRef
} from '@angular/core';
import * as moment from 'moment';
import { from } from 'rxjs';
import { Observable, fromEvent, merge } from 'rxjs';
import { debounceTime, filter, map, mapTo } from 'rxjs/operators';

/* importing internals ... */
import { MapType, MapLayer, ObservationDataType } from '../../../core/enums';
import { COLORS, GRADIENT_COLORS } from '../../../core/constants';
import {
  ObservationStruct,
  DeviceStruct,
  IColorGradient,
  ColorGradient
} from '../../../core/models';
import {
  StringExtension,
  ColorGradientExtension
} from '../../../core/extensions';
import { AppSettings, SiteSetting } from '../../../services';
import { BasePlottableComponent } from '../base.plottable.component';
import { GeographyPoint, GeographyToolings } from './geography.toolings';
import { MapLegendComponent } from './map-legend.component';

declare var ol: any;
var Color = require('color');

const MIN_PATH_PIXEL_WIDTH = 3;
const MAX_PATH_PIXEL_WIDTH = 3;

@Component({
  selector: 'app-infograph-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent extends BasePlottableComponent {
  @ViewChild('mapElement') mapElement: ElementRef;
  @ViewChild('popupElement') popupElement: ElementRef;
  @ViewChild(MapLegendComponent) legendComponent: MapLegendComponent;

  @Input()
  graphicOptions: any;
  @Input()
  from: moment.Moment;
  @Input()
  to: moment.Moment;
  /**
   * Returns TRUE when observations are added and FALSE when removed.
   */
  @Output()
  observationsSelectionChanged: EventEmitter<boolean>;

  map: any = [];
  subscriptions: any;
  protected gradientContext: CanvasRenderingContext2D;

  constructor(
    protected appSettings: AppSettings,
    protected siteSetting: SiteSetting,
    protected  cd : ChangeDetectorRef
  ) {
    super();
    this.subscriptions = {};
    this.observationsSelectionChanged = new EventEmitter<boolean>();
    this.siteSetting.mapType.valueChanges.subscribe((type: MapType) =>
      this.toggleMapLayers(this.map, type)
    );
    this.gradientContext = document.createElement('canvas').getContext('2d');
  }

  ngOnInit() {
   //this.initMap();
    this.observationsSelectionChanged
      .asObservable()
      .subscribe((addedOrRemoved: boolean) =>
        this.legendComponent.updateLegends()
      );
  }

  ngAfterViewInit() {

    setTimeout(()=>{
      this.initMap();
    },3000);
    // this.initMap();
  }

  private _getMapPopupOverlayerId() {
    return StringExtension.toSnakeCase('mpopup');
  }
  private _getDeviceLayerId(device: DeviceStruct) {
    return StringExtension.toSnakeCase(`mlayer_${device.MID}`);
  }
  private _getObservationLayerId(
    device: DeviceStruct,
    observation: ObservationStruct
  ) {
    return StringExtension.toSnakeCase(
      `mlayer_${device.MID}_${observation.Id}`
    );
  }
  private _getObservationLineLayerId(
    device: DeviceStruct,
    observation: ObservationStruct
  ) {
    return StringExtension.toSnakeCase(
      `mlinelayer_${device.MID}_${observation.Id}`
    );
  }
  private _getObservationMarkerLayerId(
    device: DeviceStruct,
    observation: ObservationStruct
  ) {
    return StringExtension.toSnakeCase(
      `mmarkerlayer_${device.MID}_${observation.Id}`
    );
  }
  private _getObservationLineFeatureId(
    device: DeviceStruct,
    observation: ObservationStruct
  ) {
    return StringExtension.toSnakeCase(`mline_${device.MID}_${observation.Id}`);
  }
  private _getObservationMarkerFeatureId(
    device: DeviceStruct,
    observation: ObservationStruct
  ) {
    return StringExtension.toSnakeCase(
      `mmarker_${device.MID}_${observation.Id}`
    );
  }
  private _getValueObservationLineFeatureId(
    device: DeviceStruct,
    observation: ObservationStruct,
    timestamp: number | string
  ) {
    return StringExtension.toSnakeCase(
      `mline_${device.MID}_${observation.Id}_${timestamp}`
    );
  }

  private addDevice(device: DeviceStruct | any): void {
    /*  - if device has been already added, return.
            - else create new group layer for device and add into map ... */
    if (
      (device =
        (this.graphicOptions.devices = this.graphicOptions.devices || {})[
          device.MID
        ] || (this.graphicOptions.devices[device.MID] = device))._layer
    ) {
      return;
    }
    this.map.addLayer(
      (device._layer = new ol.layer.Group({
        _id: this._getDeviceLayerId(device)
      }))
    );
  }

  private addObservation(
    device: DeviceStruct | any,
    observation: ObservationStruct | any
  ): void {
    /*  - if layer has been already added to observation, skip.
            - else create layer, with default style
            - draw line segments for each values. 
            - subscribe to values changes of observations and redraw. */
    if (observation._layer) {
      return;
    }

    observation._layer = new ol.layer.Group({
      _id: this._getObservationLayerId(device, observation)
    });
    device._layer.getLayers().push(observation._layer);
    var color: any =
      COLORS[Math.abs(observation._parallelIndex || 0) % COLORS.length];

    observation._lineLayer = new ol.layer.Vector({
      _id: this._getObservationLineLayerId(device, observation),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          width:
            observation.DataType === ObservationDataType.Position
              ? 0
              : MIN_PATH_PIXEL_WIDTH,
          color: color
        })
      }),
      source: new ol.source.Vector({ wrapX: true }),
      visible: observation.DataType !== ObservationDataType.Position
    });

    // observation._markerLayer = new ol.layer.Vector({
    //     _id: this._getObservationMarkerLayerId(device, observation),
    //     style: new ol.style.Style({
    //         image: new ol.style.Circle({
    //             radius: 5,
    //             snapToPixel: true,
    //             fill: new ol.style.Fill({ color: 'white' }),
    //             stroke: new ol.style.Stroke({ color: color, width: 1 })
    //         })
    //     }),
    //     source: new ol.source.Vector({ wrapX: false })
    // });

    observation._layer.getLayers().push(observation._lineLayer);
    // observation._layer.getLayers().push(observation._markerLayer);

    var subscriptions = (this.subscriptions[observation._layer.get('_id')] =
      this.subscriptions[observation._layer.get('_id')] || []);
    if (device._locationObservation == observation) {
      this.onLocationObservationValuesChange(
        device,
        observation,
        observation._values.getValue()
      );
      subscriptions.push(
        observation._values.valueChanges.subscribe((values: any[]) =>
          this.onLocationObservationValuesChange(device, observation, values)
        )
      );
      subscriptions.push(
        observation._values.itemsAdded.subscribe((values: any[]) =>
          this.onLocationObservationValuesChange(
            device,
            observation,
            values,
            true
          )
        )
      );
      return;
    }
    this.onValueObservationValuesChange(
      device,
      observation,
      observation._values.getValue()
    );
    subscriptions.push(
      observation._values.valueChanges.subscribe((values: any[]) =>
        this.onValueObservationValuesChange(device, observation, values)
      )
    );
    //subscriptions.push(observation._values.itemsAdded.subscribe((values: any[]) => this.onValueObservationValuesChange(device, observation, values)));
  }

  private setLocationObservation(
    device: DeviceStruct | any,
    observation: ObservationStruct | any
  ): void {
    /*  - if device wasn't registered, skip.
            - else set as location and create observation layers. */
    if (
      !(device = (this.graphicOptions.devices =
        this.graphicOptions.devices || {})[device.MID])
    ) {
      return;
    }
    device._locationObservation = observation;
    this.addObservation(device, observation);
  }

  private addValueObservation(
    device: DeviceStruct | any,
    observation: ObservationStruct | any
  ): void {
    /* if device wasn't registered, skip.*/
    if (
      !(device = (this.graphicOptions.devices =
        this.graphicOptions.devices || {})[device.MID])
    ) {
      return;
    }
    observation =
      (device._valueObservations = device._valueObservations || {})[
        observation.Id
      ] || (device._valueObservations[observation.Id] = observation);

    /* index of the current observation is the, current last index of the _valueObservations.keys. 
            - index positioning starts from center (zero, 0)
            - when ODD, then RIGHT (+), 
            - else when EVEN, LEFT (-). */
    var index = Object.keys(device._valueObservations).length - 1;
    observation._parallelIndex = !index
      ? index
      : parseInt(`${(index + 1) / 2}`) * (index % 2 ? 1 : -1);
    observation._color =
      GRADIENT_COLORS[
        Math.abs(observation._parallelIndex || 0) % GRADIENT_COLORS.length
      ];

    this.addObservation(device, observation);
  }

  private onLocationObservationValuesChange(
    device: DeviceStruct | any,
    observation: ObservationStruct | any,
    values: any[],
    append: boolean = false
  ) {
    /*  - skip if layer hasn't been created for the observation.
            - create line-feature if its wasn't already and add into observation layer. 
            - transform values to coordinates.
            - force draw all value-observations. */
    if (!observation._lineLayer) {
      return;
    }
    if (!observation._lineFeature) {
      observation._lineFeature = new ol.Feature({
        geometry: new ol.geom.LineString([], 'XYM')
      });
      observation._lineFeature.setId(
        this._getObservationLineFeatureId(device, observation)
      );
      observation._lineLayer.getSource().addFeature(observation._lineFeature);
    }
    // if (!observation._markerFeature) {
    //     observation._markerFeature = new ol.Feature({ geometry: new ol.geom.MultiPoint([], 'XYM') });
    //     observation._markerFeature.setId(this._getObservationMarkerFeatureId(device, observation));
    //     observation._markerLayer.getSource().addFeature(observation._markerFeature);
    // }

    values = values.map(m =>
      ol.proj.transform(
        [m.Value.Longitude, m.Value.Latitude, m.Timestamp],
        'EPSG:4326',
        'EPSG:3857'
      )
    );
    values = !append
      ? values
      : [...observation._lineFeature.getGeometry().getCoordinates(), ...values];
    observation._lineFeature.getGeometry().setCoordinates(values);
    // observation._markerFeature.getGeometry().setCoordinates(values);
    if (!append) {
      this.setZoom();
    }
    this.renderObservations(device);
  }

  private translatedForParallel(
    parallelSpacing: number,
    currentCoordinates: any,
    nextCoordinates: any = null
  ): any[] {
    var angle = nextCoordinates
      ? GeographyToolings.GetRhumbBearing(currentCoordinates, nextCoordinates)
      : 0;
    angle += 90 * (parallelSpacing / Math.abs(parallelSpacing)) || 0;
    return GeographyToolings.GetRhumbDestination(
      currentCoordinates,
      angle,
      Math.abs(parallelSpacing)
    );
  }

  private onValueObservationValuesChange(
    device: DeviceStruct | any,
    observation: ObservationStruct | any,
    values: any[],
    append: boolean = false
  ) {
    /* NOTE: we always redraw the lines for value-observation. */
    observation._layer.getLayers().forEach(m => m.getSource().clear());
    if (!device._locationObservation) {
      return;
    }

    /* 
            get matching in Value-Observersation for every in location-observation and create create entry with location from latter and value from first. 
            if matching is not found
                - use previous value
                - else use first value from value-observation
                - else 0
        */
    values = device._locationObservation._values
      .getValue()
      .reduce((results, current) => {
        let match = values.find(m => m.Timestamp >= current.Timestamp);
        match = match
          ? match.Value
          : results.length
          ? results[results.length - 1][3]
          : values.length
          ? values[0].Value
          : 0;
        results.push([
          current.Value.Longitude,
          current.Value.Latitude,
          current.Timestamp,
          match
        ]);
        return results;
      }, []);

    var sortedValues = values.map(m => m[3]).sort((a, b) => a - b);
    /* find MIN and MAX to determine segment width.*/
    observation._minValue = !sortedValues.length ? 0 : sortedValues[0];
    observation._maxValue = !sortedValues.length
      ? 0
      : sortedValues[sortedValues.length - 1];

    var seperation = !observation._parallelIndex
      ? 0
      : MAX_PATH_PIXEL_WIDTH *
        observation._parallelIndex *
        this.map.getView().getResolution();
    var previousLineFeature = observation._lineLayer.getSource().getFeatures();
    previousLineFeature = previousLineFeature.length
      ? previousLineFeature[previousLineFeature.length - 1]
      : null;

    values.forEach((coordinates, i) => {
      let nextCoordinates = i == values.length - 1 ? null : values[i + 1];
      let temp = this.translatedForParallel(
        seperation,
        coordinates,
        nextCoordinates
      );
      coordinates[0] = temp[0];
      coordinates[1] = temp[1];
      coordinates = ol.proj.transform(coordinates, 'EPSG:4326', 'EPSG:3857');

      // observation._markerFeature = observation._markerFeature ? observation._markerLayer.getSource().getFeatureById(observation._markerFeature.getId()) : null;
      // if (!observation._markerFeature) {
      //     observation._markerFeature = new ol.Feature({ geometry: new ol.geom.MultiPoint([], 'XYM') });
      //     observation._markerFeature.setId(this._getObservationMarkerFeatureId(device, observation));
      //     observation._markerLayer.getSource().addFeature(observation._markerFeature);
      // }
      // observation._markerFeature.getGeometry().appendPoint(new ol.geom.Point(coordinates.slice(0, 3), 'XYM'));

      var popupData = {
        device: device,
        observation: observation,
        from: {
          datetime: coordinates[2],
          position: { longitude: coordinates[0], latitude: coordinates[1] },
          value: coordinates[3]
        },
        to: {
          datetime: null,
          position: null,
          value: null
        }
      };
      var lineFeature =
        previousLineFeature &&
        previousLineFeature.getGeometry().getCoordinates().length < 2
          ? previousLineFeature
          : null;
      if (!lineFeature) {
        lineFeature = new ol.Feature({
          geometry: new ol.geom.LineString(
            previousLineFeature
              ? [previousLineFeature.getGeometry().getLastCoordinate()]
              : [],
            'XYM'
          )
        });
        lineFeature.setId(
          this._getValueObservationLineFeatureId(
            device,
            observation,
            coordinates[2]
          )
        );
        /* setting popup-data to feature ... */
        popupData.from =
          (previousLineFeature && previousLineFeature.get('_popupData')
            ? previousLineFeature.get('_popupData').to
            : null) || popupData.from;
        lineFeature.set('_popupData', popupData);

        lineFeature.setStyle(observation._lineLayer.getStyle().clone());
        observation._lineLayer.getSource().addFeature(lineFeature);
        previousLineFeature = lineFeature;
      }
      /* updating feature's popup-data ... */
      popupData = lineFeature.get('_popupData');
      popupData.to = {
        datetime: coordinates[2],
        position: { longitude: coordinates[0], latitude: coordinates[1] },
        value: coordinates[3]
      };
      lineFeature.getGeometry().appendCoordinate(coordinates.slice(0, 3));
      this._updateValueObservationLineFeatureStyle(lineFeature);
    });
  }

  private _updateValueObservationLineFeatureStyle(lineFeature: any) {
    var popupData = null;
    if (!(popupData = lineFeature.get('_popupData'))) {
      return;
    }

    // var width = (Math.abs((coordinates[3] - observation._minValue) / (observation._maxValue - observation._minValue)) *  (MAX_PATH_PIXEL_WIDTH - MIN_PATH_PIXEL_WIDTH)) + MIN_PATH_PIXEL_WIDTH;
    // lineFeature.getStyle().getStroke().setWidth(width);
    var style = popupData.observation._lineLayer.getStyle().clone();
    var valueRatioed0To1 =
      Math.abs(
        (Number(
          popupData.to.value != null ? popupData.to.value : popupData.from.value
        ) -
          Number(popupData.observation._minValue)) /
          (Number(popupData.observation._maxValue) -
            Number(popupData.observation._minValue))
      ) || 0;
    style
      .getStroke()
      .setColor(
        ColorGradientExtension.pickColor(
          popupData.observation._color,
          valueRatioed0To1
        )
      );
    lineFeature.setStyle(style);
  }

  protected renderObservations(device: DeviceStruct | any): void {
    Object.keys(device._valueObservations || {}).forEach(ObservationId => {
      let observation = device._valueObservations[ObservationId];
      this.onValueObservationValuesChange(
        device,
        observation,
        observation._values.getValue() || []
      );
    });
  }

  protected renderDevices(): void {
    Object.keys(this.graphicOptions.devices || {}).forEach(deviceId => {
      let device = this.graphicOptions.devices[deviceId];
      this.onLocationObservationValuesChange(
        device,
        device._locationObservation,
        device._locationObservation._values.getValue() || []
      );
    });
  }

  protected renderObservation(
    device: DeviceStruct | any,
    observation: ObservationStruct | any
  ): void {
    if (device._locationObservation == observation) {
      return this.onLocationObservationValuesChange(
        device,
        observation,
        observation._values.getValue() || []
      );
    }
    this.onValueObservationValuesChange(
      device,
      observation,
      observation._values.getValue() || []
    );
  }

  public addDeviceObservation(
    device: DeviceStruct | any,
    observation: ObservationStruct | any
  ): void {
    /*  - register device.
            - if observation is poistion set it as a LOCATION observation
            - else append it as VALUE observation */
    this.addDevice(device);
    observation.DataType === ObservationDataType.Position
      ? this.setLocationObservation(device, observation)
      : this.addValueObservation(device, observation);
    this.observationsSelectionChanged.emit(true);
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
      (observation =
        observation.DataType === ObservationDataType.Position
          ? device._locationObservation
          : (device._valueObservations = device._valueObservations || {})[
              observation.Id
            ])
    ) {
      /* unsubscribing all observation observers ... */
      var subscriptions =
        this.subscriptions[observation._layer.get('_id') || null] || null;
      if (subscriptions) {
        subscriptions.forEach(m => m.unsubscribe());
        delete this.subscriptions[observation._layer.get('_id')];
      }

      /* removing observation layer ... */
      if (!device._layer.getLayers().remove(observation._layer)) {
        return;
      }
      delete observation._lineLayer;
      delete observation._lineFeature;
      delete observation._layer;

      /* deleteing observation ... */
      observation.DataType === ObservationDataType.Position
        ? delete device._locationObservation
        : delete device._valueObservations[observation.Id];
    }

    /* remove device also, if no observations remain... 
           else update paralle-index of obervations and redraw value-observations .... */
    if (
      !device._locationObservation &&
      !Object.keys(device._valueObservations).length
    ) {
      if (!this.map.removeLayer(device._layer)) {
        return;
      }
      delete device._layer;
      delete this.graphicOptions.devices[device.MID];
    } else {
      /* updating parallel indexes of observations in device ... */
      Object.keys(device._valueObservations || {}).forEach(
        (current: any, index: number) => {
          current = device._valueObservations[current];
          current._parallelIndex = !index
            ? index
            : parseInt(`${(index + 1) / 2}`) * (index % 2 ? 1 : -1);
          current._color =
            GRADIENT_COLORS[
              Math.abs(current._parallelIndex || 0) % GRADIENT_COLORS.length
            ];
        }
      );
      this.renderObservations(device);
    }
    this.observationsSelectionChanged.emit(false);
  }

  public clearSources(): void {
    if (!this.graphicOptions) {
      return;
    }
    Object.keys(this.graphicOptions.devices || {}).forEach(deviceId => {
      let device = this.graphicOptions.devices[deviceId];
      if (device._locationObservation) {
        if (device._locationObservation._lineFeature) {
          device._locationObservation._lineFeature
            .getGeometry()
            .setCoordinates([]);
        }
        if (device._locationObservation._markerFeature) {
          device._locationObservation._markerFeature
            .getGeometry()
            .setCoordinates([]);
        }
      }
      Object.keys(device._valueObservations || {}).forEach(observationId => {
        if (device._valueObservations[observationId]._lineLayer) {
          device._valueObservations[observationId]._lineLayer
            .getSource()
            .clear();
        }
        if (device._valueObservations[observationId]._markerFeature) {
          device._valueObservations[observationId]._markerFeature
            .getGeometry()
            .setCoordinates([]);
        }
      });
    });
  }

  private isExtentFinite(extent: any[]): boolean {
    return extent && !extent.some(n => !isFinite(n));
  }

  public setZoom(): void {
    var extent = ol.extent.createEmpty();
    Object.keys(this.graphicOptions.devices || {}).forEach(deviceId => {
      let device = this.graphicOptions.devices[deviceId];
      if (!device._locationObservation) {
        return;
      }

      device._locationObservation._layer.getLayers().forEach(layer => {
        if (!this.isExtentFinite(layer.getSource().getExtent())) {
          return;
        }
        ol.extent.extend(extent, layer.getSource().getExtent());
      });
    });

    if (!this.isExtentFinite(extent)) {
      return;
    }
    this.map.getView().fit(extent, this.map.getSize());
  }

  private onMapViewResolutionChanged() {
    Object.keys(this.graphicOptions.devices || {}).forEach(deviceId => {
      let device = this.graphicOptions.devices[deviceId];
      this.renderObservations(device);
    });
  }

  private onMapInteracted(pixel: any) {
    var popupOverlayer = this.map.getOverlayById(
      this._getMapPopupOverlayerId()
    );
    if (!popupOverlayer) {
      return;
    }

    /* get last selected line feature and reset its style to original (unselected) style ... */
    var lastSelectedValueObservationLineFeature = this.map.get(
      '_lastSelectedValueObservationLineFeature'
    );
    if (lastSelectedValueObservationLineFeature) {
      this._updateValueObservationLineFeatureStyle(
        lastSelectedValueObservationLineFeature
      );
      this.map.set('_lastSelectedValueObservationLineFeature', null);
    }
    var feature = (this.map.getFeaturesAtPixel(pixel) || []).find(
      m => !!m.get('_popupData')
    );
    if (!feature) {
      return popupOverlayer.setPosition(undefined);
    }

    var popupdata = feature.get('_popupData');
    popupOverlayer.setPosition(
      feature
        .getGeometry()
        .getExtent()
        .slice(2)
    );
    popupOverlayer.getElement().innerHTML = `
		<style>
      caption {
        padding-block: 10px;
      }

			table, th, td {
				border: 1px solid #000;
				border-collapse: collapse;
      }
            
			th, td {
				padding: 5px;
				text-align: left;
      }

      th {
				text-align: center;
			}
			
			table {
				width:100%
			}
        </style>
        <table class="box">
			<caption>${popupdata.device.MID} - ${popupdata.observation.Name}</caption>
			<tr>
				<th></th> 
				<th>From</th> 
				<th>To</th> 
			</tr> 
			<tr>
                <td>Value</td>
				<td>${popupdata.from.value}</td>
				<td>${popupdata.to.value}</td> 
            </tr>
			<tr>
                <td>Timestamp</td>
				<td>${moment.utc(popupdata.from.datetime).toISOString()}</td>
				<td>${moment.utc(popupdata.to.datetime).toISOString()}</td> 
            </tr>
			<tr>
                <td>Longitude</td>
				<td>${popupdata.from.position.longitude}</td>
				<td>${popupdata.to.position.longitude}</td> 
            </tr>
			<tr>
                <td>Latitude</td>
				<td>${popupdata.from.position.latitude}</td>
				<td>${popupdata.to.position.latitude}</td> 
            </tr>
        </table>`;

    this.onValueObservationLineFeatureSelected(feature);
    this.map.set('_lastSelectedValueObservationLineFeature', feature);
  }

  /* sets selected style to the specified line-segment feature ..... */
  protected onValueObservationLineFeatureSelected(lineFeature) {
    var style = lineFeature.getStyle().clone();
    style.getStroke().setWidth(style.getStroke().getWidth() * 2);
    style.getStroke().setColor(
      Color(style.getStroke().getColor())
        .negate()
        .hex()
    );
    lineFeature.setStyle(style);
  }

  protected initMap(): void {
    this.mapElement.nativeElement.innerHTML = '';
    var mapAnalyzer = new ol.Map({
      view: new ol.View({
        zoom: 3,
        center: ol.proj.transform(
          [4.69497580094886, -44.7197850546873],
          'EPSG:4326',
          'EPSG:3857'
        )
      })
    });

    this.toggleMapLayers(mapAnalyzer, this.siteSetting.mapType.getValue());
    mapAnalyzer.setTarget(this.mapElement.nativeElement);

    mapAnalyzer.addOverlay(
      new ol.Overlay({
        id: this._getMapPopupOverlayerId(),
        positioning: 'bottom-center',
        element: this.popupElement.nativeElement
      })
    );

    merge(
      fromEvent(mapAnalyzer, 'pointermove').pipe(        
        filter((m: any) => !m.dragging),
        map((m: any) => m.pixel)
        
      ),
      fromEvent(mapAnalyzer, 'singleclick').pipe(map((m: any) => m.pixel))
    ).subscribe(m => this.onMapInteracted(m));

    fromEvent(mapAnalyzer.getView(), 'change:resolution')
      .pipe(debounceTime(300))
      .subscribe(() => this.onMapViewResolutionChanged());
     // mapAnalyzer.redraw();
    
    this.map = mapAnalyzer;
    this.cd.detectChanges();
    // this.map.setTarget(this.mapElement.nativeElement);
    // this.map.redraw();
    // setTimeout(() => {
    //   this.map.setTarget(this.mapElement.nativeElement);
    // }, 1000);
    
  }

  /**
   * Retreives the layer from the map. Also adds it into the map, if its missing ...
   *  @param map map owning the layers....
   *  @param layer layer type to retreive ....
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
      .find(m => m.get('_id') == overlayerId);
    if (resultLayer) {
      return resultLayer;
    }

    resultLayer = new ol.layer.Tile({
      _id: overlayerId,
      visible: false,
      preload: Infinity
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
            url:
              'https://cartodb-basemaps-{a-c}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', //'http://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            attributions: [
              new ol.Attribution({
                html:
                  '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.',
                title: 'Attributions'
              })
            ]
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
              layer === MapLayer.BingAerial ? 'Aerial' : 'AerialWithLabels'
          })
        );
        break;

      case MapLayer.OsmOpenSea:
        resultLayer.setZIndex(0);
        resultLayer.setSource(
          new ol.source.XYZ({
            crossOrigin: null,
            url: 'https://t1.openseamap.org/seamark/{z}/{x}/{y}.png' //'http://t1.openseamap.org/seamark/{z}/{x}/{y}.png'
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
