import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Constants } from '../../../core/constants/text.constants';
import { FileUtil } from '../../../common/file.util';
import {
  LoggerService,
  DeviceService,
  SecurityService,
  AppSettings
} from '../../../services';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {
  title: 'Import Observations';
  @ViewChild('fileImportInput')
  fileImportInput: any;
  csvRecords = [];
  selectColumn: boolean = false;
  selectDelimeter: string = '-1';
  MID: any;
  deviceObservations = [];
  generalObservations = [];
  detailedObservations = [];
  headers = [];
  allocatedObservationIdHeader = [];
  observationsToImport = [];
  previewTableRows: any[] = [];
  columns: any[];
  positionTypes = [
    { id: -1, name: 'Longitiude' },
    { id: -2, name: 'Latitude' },
    { id: -3, name: 'Altitude' }
  ];
  poistionObservationId: string = '';
  deviceAuthenticationKey: string = '';
  progress = 0;
  maximumLinesImport = this.appSettings.csv_lines_per_import_api_call;
  counter = 1;
  csvLinesPerCall = 0;
  confirmedHeaders = [];

  public delimeters = [
    { id: ';', name: '[SEMICOLON]' },
    { id: ',', name: '[COMMA]' },
    { id: '\t', name: '[TAB]' },
    { id: ' ', name: '[SPACE]' }
  ];
  constructor(
    private _router: Router,
    private _fileUtil: FileUtil,
    private loggerService: LoggerService,
    private route: ActivatedRoute,
    private deviceService: DeviceService,
    private securityService: SecurityService,
    protected appSettings: AppSettings
  ) {}

  ngOnInit() {
    this.route.params.subscribe(data => {
      this.MID = data['id'];
      forkJoin(
        this.deviceService.getDeviceDetails(this.MID),
        this.deviceService.getObservationDetails(this.MID)
      )
        .pipe(
          map(data => {
            return { devices: data[0], observations: data[1] };
          })
        )
        .subscribe(data => {
          this.generalObservations =
            data['devices']['Metadata']['Observations'];
          this.deviceObservations = data['observations'];
          this.getDeviceObservationDetails();
        });
      this.securityService.getSecurityValues(this.MID).subscribe(
        data => {
          this.deviceAuthenticationKey = data.HTTPAuthenticationKey;
        },
        error => {
          this.loggerService.showErrorMessage(
            'Getting security details failed!'
          );
        }
      );
    });
  }

  getDeviceObservationDetails() {
    this.generalObservations.forEach(genObvElement => {
      this.deviceObservations.forEach(devObvElement => {
        if (genObvElement['Id'] == devObvElement['Id']) {
          let deviceObv = {
            Id: genObvElement['Id'],
            Name: genObvElement['Name']
          };

          //Replace observation obj with new obj
          var index = this.generalObservations.indexOf(genObvElement);
          if (index !== -1) {
            this.generalObservations[index] = deviceObv;
          }
        }
      });
    });

    this.detailedObservations = this.generalObservations;
    /**If observations contain Position, split into 3 seperate position values */
    this.detailedObservations.forEach((detailedObservation, index) => {
      let positionSetA = [];
      let positionSetB = [];
      let positionSetC = [];
      if (detailedObservation['Name'] == 'Position') {
        this.poistionObservationId = detailedObservation['Id'];
        positionSetA['Id'] = -1; //detailedObservation['Id'];
        positionSetA['Name'] = 'Position.Longitiude';
        this.detailedObservations.push(positionSetA);
        positionSetB['Id'] = -2; //detailedObservation['Id'];
        positionSetB['Name'] = 'Position.Latitude';
        this.detailedObservations.push(positionSetB);
        positionSetC['Id'] = -3; //detailedObservation['Id'];
        positionSetC['Name'] = 'Position.Altitude';
        this.detailedObservations.push(positionSetC);
        this.detailedObservations.splice(index, 1);
      }
    });
    /** Set observation for Timestamp */

    this.detailedObservations.sort((a, b) => {
      if (a.Name < b.Name) return -1;
      else if (a.Name > b.Name) return 1;
      else return 0;
    });
    let data = [];
    data['Id'] = 0;
    data['Name'] = 'Timestamp';
    this.detailedObservations.unshift(data);
  }
  /**
   * Skip unnecessary csv columns importing
   * @param checked
   * @param header
   * @param index
   */
  skipValues(checked, header, index, value) {
    if (this.confirmedHeaders != null) {
      let searchHeader = this.confirmedHeaders.indexOf(header);
      // console.log(searchHeader);
      //find the header is already mapped with the observation
      let searchItem = this.allocatedObservationIdHeader.indexOf(
        i => i['columnName'] == header
      );
      // console.log(searchItem);
      if (!checked) {
        if (searchHeader != -1) {
          this.confirmedHeaders.splice(searchHeader, 1);
        }
        if (searchItem != -1) {
          this.allocatedObservationIdHeader.splice(searchItem, 1);
        }
      } else {
        this.confirmedHeaders.push(header);
        if (searchItem != -1) {
          this.allocatedObservationIdHeader.splice(searchItem, 1);
        }
      }
    }
    //  console.log(this.confirmedHeaders);
    //  console.log(this.allocatedObservationIdHeader);
  }
  /**
   * Allocate observation id to the selected header
   * @param value
   * @param header
   */
  updateValue(value, header, index) {
    if (value != 'Select an observation') {
      let data = [];
      let searchItem = this.allocatedObservationIdHeader.find(
        i => i['columnName'] == header
      );
      let headerInConfirmedHeaders = this.confirmedHeaders.indexOf(header);
      if (this.allocatedObservationIdHeader == null) {
        if (headerInConfirmedHeaders != -1) {
          data['columnName'] = header;
          data['observationId'] = value;
          data['columnIndex'] = index;
          this.allocatedObservationIdHeader.push(data);
        }
      } else if (searchItem != null) {
        if (headerInConfirmedHeaders != -1) {
          searchItem['observationId'] = value;
        }
      } else {
        if (headerInConfirmedHeaders != -1) {
          data['columnName'] = header;
          data['observationId'] = value;
          data['columnIndex'] = index;
          this.allocatedObservationIdHeader.push(data);
        }
      }
      // console.log(this.allocatedObservationIdHeader);
    }
  }
  /**
   * Generate import array with the observation, timestamp and uploaded csv data
   */
  import() {
    let recordswithOutHeaders = [];
    let observationStringToImport = '';
    recordswithOutHeaders = this.csvRecords;
    recordswithOutHeaders.shift();
    let timestampIndex = this.allocatedObservationIdHeader.findIndex(
      i => i['observationId'] == 0
    );

    recordswithOutHeaders.forEach((csvRow, csvRowIndex) => {
      this.allocatedObservationIdHeader.forEach(
        (allocatedObservationRow, allocatedObservationRowIndex) => {
          let index = allocatedObservationRow['columnIndex'];
          if (index != timestampIndex) {
            if (
              allocatedObservationRow['observationId'] != -1 &&
              allocatedObservationRow['observationId'] != -2 &&
              allocatedObservationRow['observationId'] != -3
            ) {
              let observation = {
                ObservationId: allocatedObservationRow['observationId'],
                Timestamp: csvRow[timestampIndex],
                Value: csvRow[index]
              };
              this.observationsToImport.push(observation);
            }
          }
        }
      );
    });

    recordswithOutHeaders.forEach((csvRow, csvRowIndex) => {
      let positionValue = '';
      let positionValueArray = [];
      let positionObservation = {};
      this.allocatedObservationIdHeader.forEach(
        (allocatedObservationRow, allocatedObservationRowIndex) => {
          let index = allocatedObservationRow['columnIndex'];

          if (index != timestampIndex) {
            if (
              allocatedObservationRow['observationId'] == -1 ||
              allocatedObservationRow['observationId'] == -2 ||
              allocatedObservationRow['observationId'] == -3
            ) {
              if (allocatedObservationRow['observationId'] == -1) {
                positionValueArray.push(csvRow[index]);
              }
              if (allocatedObservationRow['observationId'] == -2) {
                positionValueArray.push(csvRow[index]);
              }
              if (allocatedObservationRow['observationId'] == -3) {
                positionValueArray.push(csvRow[index]);
              }
            }
          }
        }
      );
      // console.log(positionValueArray);
      positionValue = positionValueArray.join();
      // console.log(positionValue);
      positionObservation = {
        ObservationId: this.poistionObservationId,
        Timestamp: csvRow[timestampIndex],
        Value: positionValue
      };
      this.observationsToImport.push(positionObservation);
    });
    let length = this.observationsToImport.length;

    //if length is less than maximum lined per api call
    if (length < this.maximumLinesImport) {
      for (let i = 0; i < length; i++) {
        observationStringToImport += `${this.observationsToImport[i].ObservationId},${this.observationsToImport[i].Timestamp},${this.observationsToImport[i].Value}\r\n`;
      }

      if (observationStringToImport != '') {
        this.progress = 100; //(5/length)/100;
        this.deviceService
          .importDevices(
            this.MID,
            observationStringToImport,
            this.deviceAuthenticationKey
          )
          .subscribe(
            response => {
              this.loggerService.showSuccessfulMessage(
                'Device observations successfully imported!'
              );
            },
            error => {
              this.loggerService.showErrorMessage(
                'Device observations import failed!'
              );
            }
          );
      }
      ///if more than 1 api call
    } else {
      // console.log(this.observationsToImport);
      let executionTimes = Math.ceil(length / this.maximumLinesImport);
      this.sendObservationsMoreThanOne(executionTimes, length);
    }
  }

  sendObservationsMoreThanOne(executionTimes, length) {
    let observationStringToImport = '';

    if (this.counter <= executionTimes) {
      let currentExecutionLength =
        this.csvLinesPerCall + this.maximumLinesImport;
      for (let i = this.csvLinesPerCall; i < currentExecutionLength; i++) {
        if (this.observationsToImport[i]) {
          observationStringToImport += `${this.observationsToImport[i].ObservationId},${this.observationsToImport[i].Timestamp},${this.observationsToImport[i].Value}\r\n`;
        }
      }
      // console.log(observationStringToImport);
      this.deviceService
        .importDevices(
          this.MID,
          observationStringToImport,
          this.deviceAuthenticationKey
        )
        .subscribe(response => {
          this.counter++;
          this.csvLinesPerCall += this.maximumLinesImport;
          observationStringToImport = '';
          this.progress += Math.ceil(100 / executionTimes);
          window.setTimeout(
            () => this.sendObservationsMoreThanOne(executionTimes, length),
            6000
          );
        });
    } else {
      this.loggerService.showSuccessfulMessage(
        'Device observations successfully imported!'
      );
    }
  }
  /**
   * Listen to input file changed to handle the csv data
   * @param  $event
   */
  fileChangeListener($event): void {
    var text = [];
    var files = $event.srcElement.files;

    if (Constants.validateHeaderAndRecordLengthFlag) {
      if (!this._fileUtil.isValidFile(files[0])) {
        this.loggerService.showErrorMessage(
          'Please import valid .csv or .txt file.'
        );
        // alert("Please import valid .csv or .txt file.");
        this.fileReset();
      }
    }

    var input = $event.target;
    var reader = new FileReader();
    reader.readAsText(input.files[0]);

    reader.onload = data => {
      let csvData = reader.result;
      let csvRecordsArray = csvData.toString().split(/\r\n|\n/);

      /** Detect csv file's delimeter*/
      var detect = require('detect-csv');
      var csv = detect(csvRecordsArray[0]);
      let csvDetectDelimeter = '';
      if (csv == null) {
        csvDetectDelimeter = ' ';
      } else {
        if (csv.delimiter == '\t') {
          csvDetectDelimeter = '\t';
        }
        if (csv.delimiter == ' ') {
          csvDetectDelimeter = ' ';
        } else {
          csvDetectDelimeter = csv.delimiter;
        }
      }
      if (this.selectDelimeter != csvDetectDelimeter) {
        this.loggerService.showErrorMessage(
          'Wrong delimeter selected. Please check the csv file and import again.'
        );
        this.fileReset();
        return;
      }
      /** if the */
      var headerLength = -1;
      let headersRow = [];

      /**If the delimeter is null, set the default delimeter */
      if (this.selectDelimeter == null) {
        this.loggerService.showErrorMessage(
          'Please select a delimeter from the list.'
        );
        this.fileReset();
        return;
      }
      /**if select the first row as columns */
      if (this.selectColumn) {
        //Constants.isHeaderPresentFlag
        headersRow = this._fileUtil.getHeaderArray(
          csvRecordsArray,
          this.selectDelimeter
        ); //Constants.tokenDelimeter
        headerLength = headersRow.length;
      } else {
        let headerDataLength = csvRecordsArray[0].split(this.selectDelimeter)
          .length;
        for (var i = 1; i <= headerDataLength; i++) {
          headersRow.push(`Column ${i}`); // = "";//`Column ${i}`;
        }
        headerLength = headersRow.length;
      }
      this.headers = headersRow;
      this.headers.forEach((header, index) => {
        this.confirmedHeaders[index] = header;
      });
      // this.confirmedHeaders = headersRow;

      this.csvRecords = this._fileUtil.getDataRecordsArrayFromCSVFile(
        csvRecordsArray,
        headerLength,
        Constants.validateHeaderAndRecordLengthFlag,
        this.selectDelimeter
      ); //Constants.tokenDelimeter
      /**if not select the first row as columns */
      if (!this.selectColumn) {
        this.csvRecords.unshift(headersRow);
      }
      /** Arrange table rows to bind with the datatable */
      var finalArray = [];
      this.csvRecords.forEach((record, index) => {
        if (index != 0) {
          var ele = new Object();
          this.headers.forEach((header, headIndex) => {
            ele[header.toLowerCase()] = record[headIndex];
          });
          finalArray.push(ele);
        }
      });
      /** Arrange Table headers to bind with the datatable */
      let previewColumns = [];
      this.headers.forEach(header => {
        let val = header.toLowerCase();
        var column = { name: '' };
        column.name = val[0].toUpperCase() + val.substr(1);
        previewColumns.push(column);
      });
      /** Set columns and tables rows array */
      this.columns = previewColumns;
      this.previewTableRows = [...finalArray];

      if (this.csvRecords == null) {
        //If control reached here it means csv file contains error, reset file.
        this.fileReset();
      }
    };

    reader.onerror = function() {
      alert('Unable to read ' + input.files[0]);
    };
  }

  fileReset() {
    this.fileImportInput.nativeElement.value = '';
    this.csvRecords = [];
    this.headers = [];
    this.previewTableRows = [];
    this.columns = [];
    this.selectDelimeter = '-1';
    this.selectColumn = false;
    this.progress = 0;
    this.maximumLinesImport = 2;
    this.ngOnInit();
  }
}
