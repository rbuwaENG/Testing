import * as moment from 'moment';
import { isNullOrUndefined } from 'util';
import { Component, ViewChild, OnDestroy } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { merge } from 'rxjs';
import {
  DeviceService,
  LoggerService,
  ObservationService,
  LiveConnectionService,
  AppSettings,
} from '../services';
import {
  LiveConnectRequest,
  SelectableObject,
  WebSocketSubscriber,
  ObservationStruct,
  DeviceStruct,
  DateRangedEntity,
} from '../core/models';
import { OptionsTabShowingStatus } from '../core/enums';
import { BasePlottableComponent } from '../shared/infographic/base.plottable.component';
import { LocalStorageService } from '../services/local-storage.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';

@Component({
  template: '',
})
export abstract class RangedAnalyzerComponent implements OnDestroy {
  @ViewChild(MatSidenav)
  protected OptionsTabSidenav: MatSidenav;
  protected abstract infographicComponent: BasePlottableComponent;

  public readonly OptionsTabShowingStatus: any = OptionsTabShowingStatus;
  public selectedOptionsTabShowingStatus: OptionsTabShowingStatus;

  /**
   * Holds enabled status of observations-types...
   */
  public observationDataTypeEnabledStatus: { [index: string]: boolean };
  public toggles: any[];
  public searchText: string;
  public selectedToggleIndex: any;
  public get selectedToggleValue(): any {
    return this.selectedToggleIndex != null &&
      this.selectedToggleIndex >= 0 &&
      this.selectedToggleIndex < this.toggles.length
      ? this.toggles[this.selectedToggleIndex]
      : null;
  }

  public devices: any[];
  public filteredDevices: any[];
  public selectedDeviceIds: any = {};
  public selectedDeviceObservationIds: any = {};
  public webSocketSubscriber: WebSocketSubscriber;

  isLoading = false;

  /**Loader */
  public selectedObservations = [];
  public receivedObservations = [];

  constructor(
    protected appSettings: AppSettings,
    protected loggerService: LoggerService,
    protected deviceService: DeviceService,
    protected observationService: ObservationService,
    protected liveConnectionService: LiveConnectionService,
    protected cache: LocalStorageService,
    protected dbService: NgxIndexedDBService
  ) {
    this.searchText = '';
    this.toggles = [
      Object.assign(new DateRangedEntity(), {
        name: 'Live Log',
        duration: 0,
        isLive: true,
        showDateRangeSelector: false,
        showClearBuffer: true,
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Minute',
        duration: moment.duration(1, 'minutes'),
        showDateRangeSelector: false,
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Hour',
        duration: moment.duration(1, 'hours'),
        showDateRangeSelector: false,
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Day',
        duration: moment.duration(1, 'days'),
        showDateRangeSelector: false,
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Week',
        duration: moment.duration(1, 'weeks'),
        showDateRangeSelector: false,
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'Last Month',
        duration: moment.duration(1, 'months'),
        showDateRangeSelector: false,
      }),
      Object.assign(new DateRangedEntity(), {
        name: 'User Defined',
        showDateRangeSelector: true,
      }),
    ];
    this.observationDataTypeEnabledStatus = {};
    this.webSocketSubscriber = new WebSocketSubscriber(
      this.appSettings,
      this.liveConnectionService
    );
    this.toggleOptionsTabShowingStatus(OptionsTabShowingStatus.Select);
  }

  ngOnInit() {
    this.onToggleChanged(1);
    this.loadDevices();
    /* update optionstabs showing-status to NONE, when sidenav is closed.... */
    if (this.OptionsTabSidenav) {
      merge(this.OptionsTabSidenav.closedStart).subscribe((value: any) => {
        this.selectedOptionsTabShowingStatus = this.OptionsTabSidenav.opened
          ? this.selectedOptionsTabShowingStatus
          : OptionsTabShowingStatus.None;
      });
    }
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

  public onToggleChanged(selectedToggleIndex?: number) {
    this.safeDisconnect();
    this.selectedToggleIndex =
      typeof selectedToggleIndex === typeof undefined
        ? this.selectedToggleIndex
        : selectedToggleIndex;
    this.selectedToggleValue.to =
      (this.selectedToggleValue.duration ||
      !this.selectedToggleValue.to ||
      !this.selectedToggleValue.to.isValid()
        ? null
        : this.selectedToggleValue.to) || moment.utc();
    this.selectedToggleValue.from =
      !this.selectedToggleValue.duration &&
      this.selectedToggleValue.from &&
      this.selectedToggleValue.from.isValid()
        ? this.selectedToggleValue.from
        : this.selectedToggleValue.to
            .clone()
            .subtract(
              this.selectedToggleValue.duration || moment.duration(1, 'minutes')
            );
    this.connectSelectedObservationValueStreams();
  }

  public getKeys(obj: any) {
    return Object.keys(obj || {});
  }

  public filterDevices(value: string = null) {
    value = !value ? value : value.toLowerCase();
    this.filteredDevices = (this.devices || []).filter(
      (d) =>
        !value ||
        d.MID.toLowerCase().indexOf(value) >= 0 ||
        d.Name.toLowerCase().indexOf(value) >= 0 ||
        (!isNullOrUndefined(d.Description) &&
          d.Description.toLowerCase().indexOf(value) >= 0)
    );
  }

  protected loadDevices() {
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
                    this.devices = devices[0].Value.map(
                      (m) => new DeviceStruct(m)
                    ).sort((a: any, b: any) =>
                      a.MID.toLowerCase().localeCompare(b.MID.toLowerCase())
                    );
                    this.filterDevices();
                  }
                });
              });
          });
      } else {
        this.dbService.getAll('devices').subscribe((devices) => {
          if (devices[0].Value != null) {
            this.devices = devices[0].Value.map(
              (m) => new DeviceStruct(m)
            ).sort((a: any, b: any) =>
              a.MID.toLowerCase().localeCompare(b.MID.toLowerCase())
            );
            this.filterDevices();
          }
        });
      }
    });
  }

  //Old implementation for devices

  // protected loadDevicesD() {
  //   let cachedDevices = this.cache.getAllDevices();
  //   if (cachedDevices == null) {
  //     this.deviceService
  //       .getDeviceMetaAndDeviceData('false', 'true')
  //       .subscribe((data: any[]) => {
  //         this.devices = data
  //           .map(m => new DeviceStruct(m))
  //           .sort((a: any, b: any) =>
  //             a.MID.toLowerCase().localeCompare(b.MID.toLowerCase())
  //           );
  //         this.cache.createDeviceLocalStorage(data);
  //         this.filterDevices();
  //       });
  //   } else {
  //     this.devices = cachedDevices
  //       .map(m => new DeviceStruct(m))
  //       .sort((a: any, b: any) =>
  //         a.MID.toLowerCase().localeCompare(b.MID.toLowerCase())
  //       );
  //     this.filterDevices();
  //   }
  // }

  /**
   * Evaluates if the observation is enabled in/for the component...
   * @param observation Observation to check.
   */
  protected isObservationTypeEnabled(observation: any): boolean {
    /* NOTE: If status is not found for the type, then observation is enabled by default.  */
    return (
      isNullOrUndefined(
        this.observationDataTypeEnabledStatus[observation.DataType]
      ) || this.observationDataTypeEnabledStatus[observation.DataType]
    );
  }

  /**
   * Fetches observations of device and sets to `device._observations`. Implementation is such that, only a single fetch request is always performed, maintaing integrity.
   * ** NOTE: Intended to be used internally. **
   * @param device of whose observations are to be fetched.
   */
  protected _loadObservations(
    device: DeviceStruct | any
  ): Promise<DeviceStruct> {
    /* if fetch request is still pending, return it. */
    if (device._fetchingObservationsPormise) {
      return device._fetchingObservationsPormise;
    }

    device._fetchingObservationsPormise = new Promise<DeviceStruct>(
      (resolve, reject) => {
        this.deviceService.getDeviceDetails(device.MID).subscribe(
          (data) => {
            /* update "_disabled" of OBSERVATIONS and the DEVICE later. If no OBSERVATIONS with ENABLED status is found, then DEVICE is said to be disabled... @TR */
            device._observations = data['Metadata']['Observations'].map((m) =>
              Object.assign(new ObservationStruct(m), {
                _disabled: !this.isObservationTypeEnabled(m),
              })
            );
            device._disabled = !device._observations.some((e) => !e._disabled);
            resolve(device);
            device._fetchingObservationsPormise = null;
          },
          (error) => {
            this.loggerService.showErrorMessage(
              `Getting device[${device.MID}] Observation failed!`
            );
            reject(device);
            device._fetchingObservationsPormise = null;
          }
        );
      }
    );

    return device._fetchingObservationsPormise;
  }

  /**
   * Fetches device observations if 1st-time/forced. Else resolves the device in a promise.
   * @param device of whose observations are to be fetched.
   * @param force if to fetch from server, disregard of it already fetched.
   */
  public loadObservations(
    device: DeviceStruct,
    force = false
  ): Promise<DeviceStruct> {
    // this.isLoading = true;
    return !device._observations || force
      ? this._loadObservations(device)
      : new Promise<any>((resolve, reject) => resolve(device));
  }

  /**
   * Fetches observation values and sets to `observation._values`.Implementation is such that, only a single fetch request is always performed, maintaing integrity.
   * ** NOTE: Intended to be used internally. **
   * @param device to which observation belongs to.
   * @param observation of whose values are to be fetched.
   */
  protected _loadObservationValues(
    device: DeviceStruct,
    observation: ObservationStruct
  ): Promise<ObservationStruct> {
    if (observation._fetchingValuesPormise) {
      return observation._fetchingValuesPormise;
    }

    observation._fetchingValuesPormise = new Promise<ObservationStruct>(
      (resolve, reject) => {
        this.isLoading = true;
        this.selectedObservations.push(observation.Id);
        this.observationService
          .getObservationValues(
            device.MID,
            observation.Id,
            this.selectedToggleValue.from.toDate(),
            this.selectedToggleValue.to.toDate(),
            this.selectedToggleValue.name
          )
          .subscribe(
            (data) => {
              /* commented, map is not showing data when more than 10000 */
              //data = data.length > 10000 ? data.slice(0, 10000) : data;

              /* formating time values to object, making further development easier. */
              data.forEach(
                (m) =>
                  (m.Timestamp = Number(moment.utc(m.Timestamp).format('x')))
              );
              observation._values.setValue(data);
              resolve(observation);
              observation._fetchingValuesPormise = null;
              this.receivedObservations.push(observation.Id);
              if (
                this.selectedObservations.length ==
                this.receivedObservations.length
              ) {
                this.isLoading = false;
              }
            },
            (error) => {
              this.receivedObservations.push(observation.Id);
              this.loggerService.showErrorMessage(
                `No data available for device[${device.MID}] Observation[${observation.Id}]`
              );
              if (error.status != 404) {
                reject(observation);
              }
              observation._fetchingValuesPormise = null;
              this.isLoading = false;
            }
          );
      }
    );

    return observation._fetchingValuesPormise;
  }

  /**
   * Fetches observations values if 1st-time/forced. Else resolves the observation in a promise.
   * @param device to which observation belongs to.
   * @param observation of whose values are to be fetched.
   * @param force if to fetch from server, disregard of it already fetched.
   */
  public loadObservationValues(
    device: DeviceStruct,
    observation: ObservationStruct,
    force = false
  ): Promise<ObservationStruct> {
    return !observation._values || force
      ? this._loadObservationValues(device, observation)
      : new Promise<any>((resolve, reject) => resolve(device));
  }

  /**
   * Toggles selected state of device and its observations by maintaining it's Id hashed in `selectedDeviceIds`.
   * @param device of whose selected state to be toggled.
   * @param evaluateObservationsState if device's observations states also should be updated after the device's.
   * @param isSelected state to be toggled to.
   */
  public toggleDeviceSelection(
    device: DeviceStruct,
    evaluateObservationsState: boolean = true,
    isSelected?: boolean
  ): void {
    /* 
          if the device is NOT already selected, marked it as selected by adding the device object into the selectedIds hash 
          else mark is as not selected by deleting the obj from the hash ...
        */
    if (evaluateObservationsState) {
      device._showObservations = !device._showObservations;
    }
    var _selectedObject = this.selectedDeviceIds[device.MID];
    var _isSelected: boolean =
      isSelected !== undefined ? isSelected : !_selectedObject;

    // if device details not available get data from API
    if (this.cache.getDevice(device.MID) == null) {
      this.deviceService.getDeviceDetails(device.MID).subscribe(
        (data) => {
          this.cache.updateDevice(data);
        }
      ),
        (error) => {
          this.loggerService.showErrorMessage(error);
        }
    }

    if (_selectedObject && _isSelected == false) {
      delete this.selectedDeviceIds[device.MID];
    } else {
      (this.selectedDeviceIds[device.MID] =
        this.selectedDeviceIds[device.MID] ||
        new SelectableObject(device)).isSelected = _isSelected;
    }

    /* NOTE: hack to render *ngFor dom... */
    // this.selectedDeviceIds = Object.assign({}, this.selectedDeviceIds);
    if (!evaluateObservationsState) {
      return;
    }

    /* update selected status of OBSERVATIONs, skipping the DISABLED .... */
    this.loadObservations(device).then(() => {
      this.selectedDeviceObservationIds[device.MID] =
        this.selectedDeviceObservationIds[device.MID] || {};
      device._observations.forEach((observation) => {
        if (observation._disabled) {
          return;
        }
        this.toggleDeviceObservationSelection(
          device,
          observation,
          false,
          !!_isSelected
        );
      });
    });
  }

  /**
   * Toggles selected state of observation and its device by maintaining it's Id hashed in `selectedDeviceObservationIds`.
   * @param device owning the observation.
   * @param observation of whose state to be toggled.
   * @param evaluateDeviceState if device's state should also be updated, after the observation's.
   * @param isSelected state to be toggled to.
   */
  public toggleDeviceObservationSelection(
    device: any,
    observation: any,
    evaluateDeviceState: boolean = true,
    isSelected?: boolean
  ): void {
    var _device = device.value || device;
    var _selectedObject =
      this.selectedDeviceObservationIds[_device.MID] &&
      this.selectedDeviceObservationIds[_device.MID][observation.Id];
    var _isSelected: boolean =
      isSelected == null ? !_selectedObject : isSelected;

    // if device details not available get data from API
    if (this.cache.getDevice(_device.MID) == null) {
      this.deviceService.getDeviceDetails(_device.MID).subscribe(
        (data) => {
          this.cache.updateDevice(data);
        }
      ),
        (error) => {
          this.loggerService.showErrorMessage(error);
        }
    }

    if (_selectedObject && !_isSelected) {
      delete this.selectedDeviceObservationIds[_device.MID][observation.Id];
      if (!Object.keys(this.selectedDeviceObservationIds[_device.MID]).length) {
        delete this.selectedDeviceObservationIds[_device.MID];
      }
      this.removeDeviceObservationFromInfographic(device, observation);
    } else if (!_selectedObject && _isSelected) {
      this.selectedDeviceObservationIds[_device.MID] =
        this.selectedDeviceObservationIds[_device.MID] || {};
      (this.selectedDeviceObservationIds[_device.MID][observation.Id] =
        observation),
        true;
      this.addUpdateDeviceObservationToInfographic(device, observation);
    }

    if (!evaluateDeviceState) {
      return;
    }
    /* if all enabled OBSERVATIONs are selected TRUE, else if nothing is selected FALSE, else meaning some are selected NULL (intermediate) ... @TR */
    var isDeviceSelected =
      _device._observations.filter((m) => !m._disabled).length ==
      Object.keys(this.selectedDeviceObservationIds[_device.MID] || {}).length
        ? true
        : !Object.keys(this.selectedDeviceObservationIds[_device.MID] || {})
            .length
        ? false
        : null;
    this.toggleDeviceSelection(_device, false, isDeviceSelected);
  }

  /**
   * Empties all device observation values.
   * @param disconnectFromLive should disconnect from any socket, prior to clearing the values.
   */
  public clearObservationsValues(disconnectFromLive: boolean = false): void {
    if (disconnectFromLive) {
      this.safeDisconnect();
    }
    Object.keys(this.selectedDeviceIds).forEach((deviceId) => {
      var _device = this.selectedDeviceIds[deviceId];
      _device = _device.value || _device;
      Object.keys(this.selectedDeviceObservationIds[deviceId]).forEach(
        (observationId) => {
          this.selectedDeviceObservationIds[deviceId][
            observationId
          ]._values.splice(0);
        }
      );
    });
  }

  /** Sends fetch request to all selected observations based on the selected tab.*/
  public connectSelectedObservationValueStreams(): void {
    this.clearObservationsValues();
    if (!this.selectedToggleValue.isLive) {
      return this.loadSelectedObservationValues();
    }
    this.sockectSelectedObservationValueStreams();
  }

  /** Fetches values for all selected observations. */
  public loadSelectedObservationValues(): void {
    Object.keys(this.selectedDeviceIds).forEach((deviceId) => {
      var _device = this.selectedDeviceIds[deviceId];
      _device = _device.value || _device;
      Object.keys(this.selectedDeviceObservationIds[deviceId]).forEach(
        (observationId) => {
          this.loadObservationValues(
            _device,
            this.selectedDeviceObservationIds[deviceId][observationId],
            true
          );
        }
      );
    });
  }

  /** Establishes a new socket connection composing options needed for channeling-in values for all selected device observations. */
  public sockectSelectedObservationValueStreams(): void {
    var options = Object.keys(this.selectedDeviceIds).reduce(
      (options: any[], deviceId: string) => {
        let option = new LiveConnectRequest();
        option.MID = deviceId;
        option.ObservationIds = Object.keys(
          this.selectedDeviceObservationIds[deviceId]
        ).map((m) => Number(m));
        options.push(option);
        return options;
      },
      []
    );

    if (this.webSocketSubscriber.isConnected) {
      this.webSocketSubscriber.disconnect();
    }
    this.webSocketSubscriber.connect(options).then(
      () =>
        this.webSocketSubscriber.messageStream.subscribe((message) =>
          this.onMessageChunkReceived(message)
        ),
      (error: any) => this.loggerService.showErrorMessage(error)
    );
  }

  /** Performs are safe disconnect from any existing socket.. */
  protected safeDisconnect(): void {
    if (
      this.webSocketSubscriber.isConnected &&
      (!this.selectedToggleValue ||
        (this.selectedToggleValue && !this.selectedToggleValue.isLive))
    ) {
      this.webSocketSubscriber.disconnect();
    }
  }

  /** Pushes data from socket into respective `observation._values`. */
  protected onMessageChunkReceived(message: any): void {
    /*"/exchange/MASTERTEST.X/MASTERTEST.O.3"*/
    var splits = null;
    if (
      !(splits = message.headers.destination.split('/')).length ||
      (splits = splits[splits.length - 1].split('.')).length < 3
    ) {
      return;
    }

    var deviceId = splits[0];
    var observationId = splits[splits.length - 1];
    var observation = (this.selectedDeviceObservationIds[deviceId] || {})[
      observationId
    ];
    if (!observation) {
      return;
    }

    message.body.Timestamp = Number(
      moment.utc(message.body.Timestamp).format('x')
    );
    observation._values.push(message.body);
  }

  /**
   * Adds observation to chart. Called internally when observations are selected.
   * @param device owning the observation
   * @param observation observation to be added.
   */
  protected addUpdateDeviceObservationToInfographic(
    device: DeviceStruct | any,
    observation: ObservationStruct
  ): void {
    this.infographicComponent.addDeviceObservation(
      device.value || device,
      observation
    );
  }

  /**
   * Removes observation from chart. Called internally when observations are deselected.
   * @param device owning the observation
   * @param observation observation to be removed.
   */
  protected removeDeviceObservationFromInfographic(
    device: DeviceStruct | any,
    observation: ObservationStruct
  ): void {
    this.infographicComponent.removeDeviceObservation(
      device.value || device,
      observation
    );
    observation._values.setValue([]);
  }
  /**
   * Redraw the chart when clear the previous data
   */
  redrawChart() {
    Object.keys(this.selectedDeviceIds).forEach((deviceId) => {
      var _device = this.selectedDeviceIds[deviceId];
      _device = _device.value || _device;
      Object.keys(this.selectedDeviceObservationIds[deviceId]).forEach(
        (observationId) => {
          //this.loadObservationValues(_device, this.selectedDeviceObservationIds[deviceId][observationId], true);
          this.addUpdateDeviceObservationToInfographic(
            _device,
            this.selectedDeviceObservationIds[deviceId][observationId]
          );
        }
      );
    });
  }

  /** Cleaning of the dirty things before disposing the component. */
  ngOnDestroy(): void {
    this.webSocketSubscriber.disconnect();
  }
}
