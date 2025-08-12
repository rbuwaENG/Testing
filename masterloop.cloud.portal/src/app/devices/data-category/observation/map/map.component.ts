import { Component, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { fromEvent, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/services/local-storage.service.js';
import '../../../../../assets/js/simplify.js';

import { MapType, MapLayer } from '../../../../core/enums';
import { StringExtension } from '../../../../core/extensions';
import {
  AppSettings,
  ObservationService,
  LoggerService,
  LiveConnectionService,
  SiteSetting,
  IndexedDbService,
  TemplateService,
} from '../../../../services';
import { ObservationComponent } from '../observation.component';

declare var require: any;
let simplify = require('../../../../../assets/js/simplify.js');
declare var ol: any;
@Component({
  selector: 'app-observation-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class ObservationMapComponent extends ObservationComponent {
  @ViewChildren('mapElement') mapElements: QueryList<ElementRef>;
  @ViewChildren('popupElement') popupElements: QueryList<ElementRef>;
  public readonly TrackStrokeColor = 'rgba(0,0,0,0.5)';
  mapElement: ElementRef;
  popupElement: ElementRef;
  nodata: any;
  trackStyle: any;

  constructor(
    route: ActivatedRoute,
    appSettings: AppSettings,
    observationService: ObservationService,
    loggerService: LoggerService,
    liveConnectionService: LiveConnectionService,
    protected siteSetting: SiteSetting,
    private router: Router,
    protected indexedDbService: IndexedDbService,
    protected cache: LocalStorageService,
    protected templateService: TemplateService
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
    this.siteSetting.reduceMapPoints.valueChanges.subscribe(
      (enable: boolean) =>
        this.selectedTab &&
        !this.selectedTab.isLive &&
        this.onValuesChange(this.selectedTab, this.selectedTab.values)
    );
    this.siteSetting.mapType.valueChanges.subscribe((type: MapType) => {
      this.tabs.forEach((m) => m.map && this.toggleMapLayers(m.map, type));
    });

    this.siteSetting.trackStyle.valueChanges.subscribe((trackStyle: any) => {
      this.tabs.forEach(
        (m) => m.map && this.toggleTrackStyle(m.map, trackStyle)
      );
      this.trackStyle = trackStyle;
    });

    /**Handles url navigation on same url**/
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
  }

  /**
   * Determines if the extend is valid finite.
   * @param extent extend to check
   */
  private _isExtentFinite(extent: any[]): boolean {
    return extent && !extent.some((n) => !isFinite(n));
  }

  /**
   * Checks if a function is in the supplied object.
   * @param source the object to check against
   * @param functionToCheck function to check for
   */
  private _hasFunction(source: any, functionToCheck: string): boolean {
    return typeof source[functionToCheck] === 'function';
  }

  protected onPreDataFetch(targetTab: any): void {
    super.onPreDataFetch(targetTab);
    if (targetTab.map) {
      targetTab.map._lineFeature.getGeometry().setCoordinates([]);
      targetTab.map._markerLayer.getSource().clear();
    }
  }

  protected onDataReceivedSuccess(targetTab: any, data: any | any[]): void {
    super.onDataReceivedSuccess(
      targetTab,
      (data = (data = data || []) instanceof Array ? data : [data])
    );
    this.onValuesChange(targetTab, data, targetTab.isLive);
  }

  protected simplifyData(targetTab: any, data: any[]): any[] {
    return !targetTab.isLive &&
      data &&
      data.length > 50 &&
      this.siteSetting.reduceMapPoints.getValue()
      ? simplify(data, 0.0001)
      : data;
  }

  /**
   * Todo when values of the observations changes. like updating the markers and path on map.
   * @param targetTab tab owning the map
   * @param values changed values
   * @param append values has to be updated or appended
   */
  protected onValuesChange(
    targetTab: any,
    values: any[],
    append: boolean = false
  ) {
    /* initialize map if for the first time .... */
    if (!targetTab.map) {
      this.initMap(targetTab, values);
    }
    /** drawing into line layer */
    if (!targetTab.map._lineLayer) {
      return;
    }
    if (!targetTab.map._lineFeature) {
      targetTab.map._lineFeature = new ol.Feature({
        geometry: new ol.geom.LineString([], 'XYM'),
        data: {},
      });
      targetTab.map._lineLayer
        .getSource()
        .addFeature(targetTab.map._lineFeature);
    }
    values = this.simplifyData(targetTab, values);
    targetTab.map._lineFeature
      .getGeometry()
      .setCoordinates([
        ...(!append
          ? []
          : targetTab.map._lineFeature.getGeometry().getCoordinates()),
        ...values.map((m) =>
          ol.proj.transform(
            [m.Value.Longitude, m.Value.Latitude, m.Timestamp],
            'EPSG:4326',
            'EPSG:3857'
          )
        ),
      ]);

    /** drawing into  marker layer */
    if (!append) {
      targetTab.map._markerLayer.getSource().clear();
    }
    values = values.map(
      (m) =>
        new ol.Feature({
          geometry: new ol.geom.Point(
            ol.proj.transform(
              [m.Value.Longitude, m.Value.Latitude, m.Timestamp],
              'EPSG:4326',
              'EPSG:3857'
            ),
            'XYM'
          ),
          data: {
            Timestamp: m.Timestamp,
            Value: {
              Longitude: m.Value.Longitude,
              Latitude: m.Value.Latitude,
              Altitude: m.Value.Altitude,
            },
          },
        })
    );

    /** set track style to marker features */
    this.setTrackStyle();
    let fillColor = null;
    if (this.trackStyle['strokeColor'] == this.TrackStrokeColor)
      fillColor = this.trackStyle['fillColor'];
    let deviceStyle = this.setDeviceLayerStyle(
      this.trackStyle['fillColor'],
      this.trackStyle['strokeColor'],
      fillColor != null
    );
    for (let value of values) {
      value.setStyle(deviceStyle);
    }

    targetTab.map._markerLayer.getSource().addFeatures(values);
    //this.setZoom(targetTab);
    if (!targetTab.isLive) {
      this.setZoom(targetTab);
    }
  }

  /**
   * Calculates zoom extent and sets zoom to the map...
   * @param targetTab tab owning the map
   */
  protected setZoom(targetTab: any): void {
    var extent = ol.extent.createEmpty();
    targetTab.map.getOverlays().forEach((olayer) => {
      if (
        !this._hasFunction(olayer, 'getSource') ||
        !this._isExtentFinite(olayer.getSource().getExtent())
      ) {
        return;
      }
      ol.extent.extend(extent, olayer.getSource().getExtent());
    });
    if (!this._isExtentFinite(extent)) {
      return;
    }

    targetTab.map.getView().fit(extent, targetTab.map.getSize());
    // targetTab.map.getView().fit(extent, {size:targetTab.map.getSize(), maxZoom:15});
  }

  /**
   * Todo when click/hover event is triggered against the map ...
   * @param targetTab tab owning the map
   * @param pixel pixel point where the event was triggered.
   */
  protected onMapInteracted(targetTab: any, pixel: any): void {
    if (!targetTab.map._popupLayer) {
      return;
    }

    /* get last selected marker-feature and reset its style to original (unselected) style ... */
    var lastSelectedValueObservationLineFeature = targetTab.map.get(
      '_lastSelectedFeature'
    );

    /** set selected track style and generate new line style and point style*/
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

    if (lastSelectedValueObservationLineFeature) {
      if (!lastSelectedValueObservationLineFeature.get('data')) {
        /** set line styles based preset if hovered over path */
        lastSelectedValueObservationLineFeature.setStyle(lineStyle, lineStyle);
      } else {
        /** set line styles based preset if hovered over point */
        let styles = deviceStyle;
        if (this.trackStyle['strokeColor'] == this.TrackStrokeColor) {
          lineStyle.push(deviceStyle);
          styles = lineStyle;
        }

        lastSelectedValueObservationLineFeature.setStyle(styles);
      }
      targetTab.map.set('_lastSelectedFeature', null);
    }

    let features = targetTab.map.forEachFeatureAtPixel(
      pixel,
      function (feature, wmsLyr09) {
        return feature;
      }
    );

    // if (!features) {
    //   return;
    // };

    let feature = features;

    /* get first matching feature with popup data. if not found, hide popup and skip ... */
    // var feature = (targetTab.map.forEachFeatureAtPixel(pixel) || []).find(
    //   m => !!m.get('data')
    // );

    if (!feature) {
      return targetTab.map._popupLayer.setPosition(undefined);
    }

    /* update popup with marker's data and set selected style to marker */
    var popupdata = feature.get('data');
    if (popupdata.Timestamp != undefined) {
      targetTab.map._popupLayer.setPosition(
        feature.getGeometry().getExtent().slice(2)
      );
      targetTab.map._popupLayer.getElement().innerHTML = `
            <div>
                <span>Timestamp: ${popupdata.Timestamp}<span></br>
                <span>Longitude: ${popupdata.Value.Longitude}<span></br>
                <span>Latitude: ${popupdata.Value.Latitude}<span></br>
                <span>Altitude: ${popupdata.Value.Altitude}<span>
            </div>`;
    }

    let styles = [
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          stroke: new ol.style.Stroke({
            color:
              popupdata && popupdata.Timestamp
                ? '#ffa500 '
                : this.trackStyle['fillColor'],
            width: 1.5,
          }),
        }),
      }),
    ];

    /** set additional styles based on hover for path and points */
    if (this.trackStyle['strokeColor'] == this.TrackStrokeColor) {
      styles.push(
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: this.trackStyle['strokeColor'],
            width: 6,
          }),
        })
      );
      styles.push(
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: this.trackStyle['fillColor'],
            width: 4.5,
          }),
        })
      );
    } else {
      styles.push(
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: this.trackStyle['strokeColor'],
            width: 2,
          }),
        })
      );
    }
    feature.setStyle(styles);
    targetTab.map.set('_lastSelectedFeature', feature);
  }

  /**
   * Initialize a map to the native element ...
   * @param targetTab tab owning the map ...
   */
  protected initMap(targetTab: any, data = null): void {
    targetTab.mapElement = this.mapElements.find(
      (e) => e.nativeElement.getAttribute('data-tabid') == targetTab.id
    );
    targetTab.popupElement = this.popupElements.find(
      (e) => e.nativeElement.getAttribute('data-tabid') == targetTab.id
    );
    targetTab.mapElement.nativeElement.innerHTML = ''; //clearing inneHTML for new map load.

    let lat = 4.69497580094886;
    let lon = -44.7197850546873;
    let zoomLevel = 3;
    if (targetTab.isLive) {
      lon = targetTab.values[0].Value.Longitude;
      lat = targetTab.values[0].Value.Latitude;
      zoomLevel = 15;
    }

    var mapOne = new ol.Map({
      view: new ol.View({
        //zoom: 7,
        //center: ol.proj.transform([4.69497580094886, -44.7197850546873], 'EPSG:4326', 'EPSG:3857')

        zoom: zoomLevel,
        center: ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857'),
      }),
    });

    /* add tile layer ... */
    this.toggleMapLayers(mapOne, this.siteSetting.mapType.getValue());

    /** set selected track style and generate new line style and point styles*/
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
    /* add line layer ... */
    mapOne.addOverlay(
      (mapOne._lineLayer = new ol.layer.Vector({
        style: lineStyle,
        source: new ol.source.Vector({ wrapX: false }),
      }))
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
        element: targetTab.popupElement.nativeElement,
      }))
    );
    mapOne.setTarget(targetTab.mapElement.nativeElement);

    // Observable
    //         .merge(Observable.fromEvent(map, 'pointermove').filter((m: any) => !m.dragging).map((m: any) => m.pixel), Observable.fromEvent(map, 'singleclick').map((m: any) => m.pixel))
    //         .subscribe(m => this.onMapInteracted(targetTab, m));

    // merge(fromEvent(map, 'pointermove').pipe(filter((m: any) => !m.dragging),map((m: any) => m.pixel)), fromEvent(map, 'singleclick').map((m: any) => m.pixel))
    //         .subscribe(m => this.onMapInteracted(targetTab, m));

    /* show/hide popup on interaction of map ...*/

    // const clicks = fromEvent(map, 'pointermove');
    // const first = clicks.pipe(
    //   map((m) => m.pixel),
    // );
    // const sec = first.pipe(mergeAll());
    // sec.subscribe(m => this.onMapInteracted(targetTab, m));

    merge(
      fromEvent(mapOne, 'pointermove').pipe(
        filter((m: any) => !m.dragging),
        map((m: any) => m.pixel)
      ),
      fromEvent(mapOne, 'singleclick').pipe(map((m: any) => m.pixel))
    ).subscribe((m) => this.onMapInteracted(targetTab, m));

    // fromEvent(mapOne, 'singleclick').pipe(map((m: any) => m.pixel)).subscribe(m => this.onMapInteracted(targetTab, m));

    targetTab.map = mapOne;
  }

  /** initialize track style if not found */
  private setTrackStyle() {
    let trackStyle = this.siteSetting.trackStyle.getValue();
    if (!this.trackStyle) this.trackStyle = trackStyle;
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
            key: this.appSettings.bing_maps_token,
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

  protected toggleTrackStyle(map: any, trackStyle): void {
    let lineLayerSourceFeatures = map._lineLayer.getSource().getFeatures();
    let fillColor;
    if (lineLayerSourceFeatures) {
      if (trackStyle['strokeColor'] == this.TrackStrokeColor)
        fillColor = trackStyle['fillColor'];
      lineLayerSourceFeatures[0].setStyle(
        this.setLineLayerStyle(trackStyle['strokeColor'], fillColor)
      );
    }
    let markerLayerSourceFeatures = map._markerLayer.getSource().getFeatures();
    let markerStyle = this.setDeviceLayerStyle(
      trackStyle['fillColor'],
      trackStyle['strokeColor'],
      fillColor != null
    );
    for (let feature of markerLayerSourceFeatures) {
      feature.setStyle(markerStyle);
    }
  }
}
