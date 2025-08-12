import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import {
  DeviceService,
  LiveConnectionService,
  AppSettings,
  LoggerService,
  IndexedDbService,
  TemplateService,
} from '../../../services';
import { ActivatedRoute, Params } from '@angular/router';
import { WebSocketSubscriber, LiveConnectRequest } from '../../../core/models';
import * as moment from 'moment';
import { DataTypeColors } from '../../../core/constants/dataType-colors';
import { MatDialog } from '@angular/material/dialog';
import { ObservationOverflowDialog } from '../observations/observation-dialog.component';
import { LatestOverflowDialog } from './latest-overflow.component';
import { DeviceStatusColorGenerator } from '../../../core/helpers/device-color-generator.helper';
import { QuantityItem } from 'src/app/core/interfaces/quantity-unit.interface';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-multiple-observations',
  templateUrl: './multiple-observations.component.html',
  styleUrls: ['./multiple-observations.component.scss'],
})
export class MultipleObservationsComponent implements OnInit {
  protected webSocketSubscriber: WebSocketSubscriber;
  deviceId: number;
  observations = [];
  mappedObservations = [];
  isMobile: boolean = false;
  showRecentFirst: boolean = false;
  selectedValue: string;
  deviceStatusColor;
  quantities: QuantityItem[];

  constructor(
    private deviceService: DeviceService,
    protected appSettings: AppSettings,
    protected liveConnectionService: LiveConnectionService,
    protected loggerService: LoggerService,
    private activateRoute: ActivatedRoute,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
    protected indexedDbService: IndexedDbService,
    protected cache: LocalStorageService,
    protected templateService: TemplateService,
    private ngZone: NgZone
  ) {
    this.activateRoute.params.subscribe((params: Params) => {
      this.deviceId = params['deviceId'];
      this.webSocketSubscriber = new WebSocketSubscriber(
        this.appSettings,
        this.liveConnectionService
      );
      this.getTemplateUnits();
      this.getDeviceDetails();
    });

    /** Mobile UI trigger */
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      this.isMobile = true;
    }
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

  ngOnInit() {
    this.selectedValue = 'time';
    this.setDeviceStatusColor();
  }

  setDeviceStatusColor() {
    let pulseTime = null;
    this.deviceService.getDevicePulses(this.deviceId).subscribe((data) => {
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

  open(item) {
    let observationOverflow = {};
    observationOverflow['MID'] = this.deviceId;
    observationOverflow['ObservationName'] = 111;
    observationOverflow['Timestamp'] = item['Timestamp'];
    observationOverflow['CurrentValue'] = item['Value'];
    const dialogRef = this.dialog.open(LatestOverflowDialog, {
      backdropClass: 'custom-dialog-backdrop-class',
      panelClass: 'custom-dialog-panel-class',
      disableClose: false,
      width: '600px',
      height: '400px',
      position: {
        top: '',
        bottom: '',
        left: '',
        right: '',
      },
      data: { observationOverflow },
    });

    dialogRef.afterClosed().subscribe((result) => {
      //dialogRef = null;
    });
  }

  protected loadValuesViaSocket() {
    this.webSocketSubscriber
      .connect(this.getLiveConnectionRequestOptions())
      .then(
        () =>
          this.webSocketSubscriber.messageStream.subscribe((message) => {
            this.ngZone.run(() => { // added ngZone to fix change detection issue, that causes random gray boxes appears in live observation view. (MCS 195)
              this.onDataReceivedSuccess(message)
            });
          }
          ),
        (error: any) => this.onDataReceivedError(error)
      );
  }

  getDeviceDetails() {
    this.deviceService.getDeviceDetails(this.deviceId).subscribe((device) => {
      var observations = device.Metadata.Observations;
      this.setAbbreviation(observations);
      this.mappedObservations = observations.map((a) => ({
        Id: a.Id,
        Name: a.Name,
        Timestamp: 'Never',
        Value: '',
        ToolTip: '',
        TitleColor: '',
        ValueColor: '',
        TextColor: '',
        DataType: a.DataType,
        UnitAbbreviation: a.UnitAbbreviation,
        OriginalTimestamp: '',
      }));

      this.loadValuesViaSocket();
    });
  }

  setAbbreviation(observations: any) {
    let unit = null;
    observations.forEach((element) => {
      let quantity = this.quantities.find((x) => x.Id === element.Quantity);
      if (quantity.Units) {
        unit = quantity.Units.find((x) => x.Id === element.Unit);
      }
      element.UnitAbbreviation = unit.Abbreviation;
    });
  }

  protected getLiveConnectionRequestOptions(): LiveConnectRequest[] {
    return [
      Object.assign(new LiveConnectRequest(), {
        MID: this.deviceId,
        InitObservationValues: true,
        ConnectAllObservations: true,
      }),
    ];
  }

  protected onDataReceivedSuccess(message) {
    let destination = message.headers.destination;
    let destinationSplitData = destination.split('/');
    let observationIdData =
      destinationSplitData[destinationSplitData.length - 1].split('.');
    let observationId = observationIdData[observationIdData.length - 1];

    let existObservationValue = this.mappedObservations.find(
      (a) => a.Id == observationId
    );
    let index = this.mappedObservations.indexOf(existObservationValue);

    let displayValue = message.body.Value.toString();
    let toolTip = '';

    if (existObservationValue.DataType == 6) {
      //Observation value (max 20 chars displayed, rest as tooltip)
      if (displayValue.length > 20) {
        if (this.isMobile) {
          toolTip = displayValue.substring(17);
          displayValue = `${displayValue.substring(0, 17)}...`;
        } else {
          toolTip = displayValue.substring(20);
          displayValue = `${displayValue.substring(0, 20)}...`;
        }
      }
      this.mappedObservations[index].Value = displayValue;
      this.mappedObservations[index].TextColor = '#000000';
    } else if (existObservationValue.DataType == 5) {
      var positionValue = this.generatePositionDisplayValue(message.body.Value);

      if (this.isMobile && positionValue.length > 20) {
        toolTip = positionValue.substring(17);
        positionValue = `${positionValue.substring(0, 17)}...`;
      }
      this.mappedObservations[index].Value = positionValue;
      this.mappedObservations[index].TextColor = '#000000';
    } else if (existObservationValue.DataType == 3) {
      this.mappedObservations[index].Value = this.mapDecimalPlaces(
        message.body.Value
      );
      this.mappedObservations[index].TextColor = '#000000';
    } else if (existObservationValue.DataType == 7) {
      let stats = `Max : ${message.body.Value.Maximum},Min : ${message.body.Value.Minimum},Avg: ${message.body.Value.Median},Mean: ${message.body.Value.Mean},StdDev: ${message.body.Value.StdDev},Count: ${message.body.Value.Count},From: ${message.body.Value.From},To: ${message.body.Value.To}`;
      this.mappedObservations[index].Value = stats;
      this.mappedObservations[index].TextColor = '#000000';
    } else {
      this.mappedObservations[index].Value = message.body.Value;
      this.mappedObservations[index].TextColor = '#000000';
    }

    this.mappedObservations[index].OriginalTimestamp = message.body.Timestamp;
    var timestamp = this.calculateTimeDuration(message.body.Timestamp);
    let color = this.mapColor(existObservationValue.DataType);

    this.mappedObservations[index].ToolTip = toolTip;
    this.mappedObservations[index].Timestamp = timestamp;
    this.mappedObservations[index].TitleColor = color.TitleColor;
    this.mappedObservations[index].ValueColor = color.ValueColor;

    this.mappedObservations.sort((a, b) => {
      var textA = a.Name.toUpperCase();
      var textB = b.Name.toUpperCase();
      return textA < textB ? -1 : textA > textB ? 1 : 0;
    });

    this.mappedObservations.forEach((a) => {
      if (a.Timestamp == 'Never') {
        a.TitleColor = 'white';
        a.ValueColor = 'white';
        a.TextColor = '#D3D3D3';
      }

      // if (a.Value != "" && a.Value !== undefined) {
      //   a.TextColor = "#000000"
      // }
    });

    /**
     * sort tiles if the selection is made
     */
    this.sortBySelection();
  }

  sortBySelection() {
    //console.log(this.selectedValue);
    if (this.selectedValue == 'time') {
      this.mappedObservations.sort((a: any, b: any) => {
        //sort accordingly if timestamp is empty
        if (a.OriginalTimestamp == '' && b.OriginalTimestamp != '') {
          return 1;
        } else if (a.OriginalTimestamp != '' && b.OriginalTimestamp == '') {
          return -1;
        } else if (a.OriginalTimestamp == '' && b.OriginalTimestamp == '') {
          return 0;
        }

        //sort timestamp in descending order
        let firstDate = new Date(a.OriginalTimestamp);
        let secondDate = new Date(b.OriginalTimestamp);
        if (firstDate < secondDate) {
          return 1;
        } else if (firstDate > secondDate) {
          return -1;
        } else {
          return 0;
        }
      });
    } else if (this.selectedValue == 'id') {
      this.mappedObservations.sort(function (a, b) {
        return -(b.Id - a.Id || a.Name.localeCompare(b.Name));
      });
    } else {
      this.mappedObservations.sort((a, b) => {
        var textA = a.Name.toUpperCase();
        var textB = b.Name.toUpperCase();
        return textA < textB ? -1 : textA > textB ? 1 : 0;
      });
    }

    //set the sorted observations to cards
    this.observations = [...this.mappedObservations];
    this.cd.detectChanges();
  }

  sortTilesBasedOnSelection() {
    if (this.showRecentFirst) {
      this.mappedObservations.sort((a: any, b: any) => {
        //sort accordingly if timestamp is empty
        if (a.OriginalTimestamp == '' && b.OriginalTimestamp != '') {
          return 1;
        } else if (a.OriginalTimestamp != '' && b.OriginalTimestamp == '') {
          return -1;
        } else if (a.OriginalTimestamp == '' && b.OriginalTimestamp == '') {
          return 0;
        }

        //sort timestamp in descending order
        let firstDate = new Date(a.OriginalTimestamp);
        let secondDate = new Date(b.OriginalTimestamp);
        if (firstDate < secondDate) {
          return 1;
        } else if (firstDate > secondDate) {
          return -1;
        } else {
          return 0;
        }
      });
    } else {
      this.mappedObservations.sort((a, b) => {
        var textA = a.Name.toUpperCase();
        var textB = b.Name.toUpperCase();
        return textA < textB ? -1 : textA > textB ? 1 : 0;
      });
    }

    //set the sorted observations to cards
    this.observations = [...this.mappedObservations];
    this.cd.detectChanges();
  }
  /** Checkbox toggle handle for show recent tiles first */
  toggle(event) {
    if (event.checked) {
      this.showRecentFirst = true;
    } else {
      this.showRecentFirst = false;
    }
    this.sortTilesBasedOnSelection();
  }

  onDataReceivedError(error) {
    this.loggerService.showErrorMessage(error);
  }

  public ngOnDestroy(): void {
    this.webSocketSubscriber.disconnect();
  }

  //Timestamp: (if > 24hrs, show x days ago, else show HH:mm:ss)
  private calculateTimeDuration(originalTimestamp) {
    let timestamp;
    if (originalTimestamp) {
      let diff = new Date().getTime() - new Date(originalTimestamp).getTime();
      let diffDays = Math.round(diff / (1000 * 3600 * 24));

      if (diffDays < 1) {
        let m = moment.utc(originalTimestamp).toISOString(); //;format('HH:mm:ss')
        timestamp = `${m}`;
      } else if (diffDays == 1) {
        timestamp = '1 day ago';
      } else if (diffDays > 1) {
        timestamp = `${diffDays} days ago`;
      }
    }

    return timestamp;
  }

  private generatePositionDisplayValue(posRawValue) {
    let posDisplayValue = '';

    if (posRawValue.Latitude && posRawValue.Latitude < 0) {
      posDisplayValue = `${Math.abs(Number(posRawValue.Latitude)).toFixed(5)}S`;
    } else {
      posDisplayValue = `${Number(posRawValue.Latitude).toFixed(5)}N`;
    }

    if (posRawValue.Longitude && posRawValue.Longitude < 0) {
      posDisplayValue = `${posDisplayValue} ${Math.abs(
        Number(posRawValue.Longitude)
      ).toFixed(5)}W`;
    } else {
      posDisplayValue = `${posDisplayValue} ${Number(
        posRawValue.Longitude
      ).toFixed(5)}E`;
    }

    if (posRawValue.Altitude) {
      posDisplayValue = `${posDisplayValue} ${Number(
        posRawValue.Altitude
      ).toFixed(1)}m`;
    }

    return posDisplayValue;
  }

  private mapColor(dataType) {
    var color = { TitleColor: '', ValueColor: '' };

    switch (dataType) {
      case 2: {
        color.TitleColor = DataTypeColors.BooleanDark;
        color.ValueColor = DataTypeColors.BooleanLight;
        break;
      }
      case 3: {
        color.TitleColor = DataTypeColors.DoubleDark;
        color.ValueColor = DataTypeColors.DoubleLight;
        break;
      }
      case 4: {
        color.TitleColor = DataTypeColors.IntegerDark;
        color.ValueColor = DataTypeColors.IntegerLight;
        break;
      }
      case 5: {
        color.TitleColor = DataTypeColors.PositionDark;
        color.ValueColor = DataTypeColors.PositionLight;
        break;
      }
      case 6: {
        color.TitleColor = DataTypeColors.StringDark;
        color.ValueColor = DataTypeColors.StringLight;
        break;
      }
    }
    return color;
  }

  private mapDecimalPlaces(value) {
    if (isNaN(value)) return;

    var numberValue = Number(value);
    if (numberValue % 1 == 0) {
      return value;
    } else {
      let roundedValue;
      let count = this.countDecimals(numberValue);

      if (numberValue < 10 && count >= 8) {
        roundedValue = numberValue.toFixed(8);
      } else if (numberValue < 100 && count >= 7) {
        roundedValue = numberValue.toFixed(7);
      } else if (numberValue < 1000 && count >= 6) {
        roundedValue = numberValue.toFixed(6);
      } else if (numberValue < 10000 && count >= 5) {
        roundedValue = numberValue.toFixed(5);
      } else if (numberValue < 100000 && count >= 4) {
        roundedValue = numberValue.toFixed(4);
      } else if (numberValue < 1000000 && count >= 3) {
        roundedValue = numberValue.toFixed(3);
      } else if (numberValue < 10000000 && count >= 2) {
        roundedValue = numberValue.toFixed(2);
      } else if (numberValue < 100000000 && count >= 1) {
        roundedValue = numberValue.toFixed(1);
      } else {
        roundedValue = Math.round(numberValue);
      }
      return roundedValue;
    }
  }

  private countDecimals(value) {
    if (Math.floor(value) !== value)
      return value.toString().split('.')[1].length || 0;
    return 0;
  }
}
