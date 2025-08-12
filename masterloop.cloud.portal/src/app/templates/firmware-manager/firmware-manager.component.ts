import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LoggerService, TemplateService } from 'src/app/services';
import { Firmware } from '../../core/constants/firmware-sample';
import { Variant } from '../../core/models/variant';
import { CreateFirmwareDialog } from './create-firmware-dialog.component';

@Component({
  selector: 'app-firmware-manager',
  templateUrl: './firmware-manager.component.html',
  styleUrls: ['./firmware-manager.component.scss'],
})
export class FirmwareManagerComponent implements OnInit {
  /**
   * Mocking up objects to further development
   *
   */
  TID;
  firmwares;

  currentFirmwareDetails: any;
  releaseIds = [];
  currentFirmwareReleaseId;
  selectedReleaseId: any;

  variants: Variant[];
  variantDetails: any[] = [];
  firmwareReleases;

  valueSelected: boolean = false;
  selectedVersion = '';
  selectedReleaseDate = '';
  selectedSize = '';
  selectedMD5 = '';
  selectedUrl = '';

  constructor(
    route: ActivatedRoute,
    private templateService: TemplateService,
    private loggerService: LoggerService,
    public dialog: MatDialog
  ) {
    this.TID = route.snapshot.params['templateId'];
  }

  ngOnInit(): void {
    this.loadFirmwareVariants();
  }

  loadFirmwareVariants() {
    this.templateService.getTemplateVariants(this.TID).subscribe((data) => {
      this.variants = data;
      this.firmwareReleases = Firmware.VariantsReleases;
      this.handleFirmwareVariants();
    });
  }

  handleFirmwareVariants() {
    if (this.variants.length != 0) {
      if (this.variants.length > 1) {
        this.handleMultipleVariants();
      } else {
        this.handleSingleVariants();
      }
    }
  }

  handleMultipleVariants() {
    this.variants.forEach((variant) => {
      let getVariantFirmwareDetails =
        this.templateService.getVariantFirmwareDetails(this.TID, variant.Id);
      let variantCurrentFirmware =
        this.templateService.getVariantCurrentFirmwareDetails(
          this.TID,
          variant.Id
        );

      forkJoin([getVariantFirmwareDetails, variantCurrentFirmware]).subscribe(
        (results) => {
          let variantInfo = [];
          variantInfo['Id'] = variant.Id;
          variantInfo['Name'] = variant.Name;
          variantInfo['Releases'] = [];

          if (results[0] != null) {
            if (results[1] == null) {
              results[1] = results[0][0];
            }
            variantInfo['selectedReleaseId'] = results[1].Id;
            variantInfo['VersionNo'] = results[1].VersionNo;
            variantInfo['ReleaseDate'] = results[1].ReleaseDate;
            variantInfo['Size'] = results[1].Size;
            variantInfo['FirmwareMD5'] = results[1].FirmwareMD5;
            variantInfo['Url'] = results[1].Url;

            if (results[0].length > 0) {
              results[0].forEach((r) => {
                let firmWareData = [];
                if (r.Id == results[1].Id) {
                  var date = new Date(r.ReleaseDate).toISOString().slice(0, 19);
                  firmWareData['id'] = r.Id;
                  firmWareData['value'] = `${r.VersionNo} (${date})-Current`;
                  firmWareData['selected'] = 1;
                  firmWareData['disabled'] = 0;
                  // if(r.Id > results[1].Id) {
                  //   firmWareData['disabled'] = 0;
                  //  } else {
                  //   firmWareData['disabled'] = 1;
                  //  }
                  variantInfo['Releases'].push(firmWareData);
                } else {
                  var date = new Date(r.ReleaseDate).toISOString().slice(0, 19);
                  firmWareData['id'] = r.Id;
                  firmWareData['value'] = `${r.VersionNo} (${date})`;
                  firmWareData['selected'] = 0;
                  firmWareData['disabled'] = 0;
                  // if(r.Id > results[1].Id) {
                  //   firmWareData['disabled'] = 0;
                  //  } else {
                  //   firmWareData['disabled'] = 1;
                  //  }
                  variantInfo['Releases'].push(firmWareData);
                }
              });
            }
          }
          this.variantDetails.push(variantInfo);
          this.variantDetails.sort(function (a, b) {
            return a.Id - b.Id;
          });
        }
      );
    });
  }

  handleSingleVariants() {
    let getFirmwareDetails = this.templateService.getFirmwareDetails(this.TID);
    let currentFirmware = this.templateService.getCurrentFirmwareDetails(
      this.TID
    );

    forkJoin([getFirmwareDetails, currentFirmware]).subscribe((results) => {
      this.firmwares = results[0];
      this.currentFirmwareDetails = results[1];
      let variantInfo = [];
      variantInfo['Id'] = this.variants[0].Id;
      variantInfo['Name'] = this.variants[0].Name;
      variantInfo['Releases'] = [];
      if (this.currentFirmwareDetails == null && this.firmwares != null) {
        this.currentFirmwareDetails = results[0][0];
      }
      if (this.firmwares != null) {
        variantInfo['selectedReleaseId'] = this.currentFirmwareDetails.Id;
        variantInfo['VersionNo'] = this.currentFirmwareDetails.VersionNo;
        variantInfo['ReleaseDate'] = this.currentFirmwareDetails.ReleaseDate;
        variantInfo['Size'] = this.currentFirmwareDetails.Size;
        variantInfo['FirmwareMD5'] = this.currentFirmwareDetails.FirmwareMD5;
        variantInfo['Url'] = this.currentFirmwareDetails.Url;
        if (this.firmwares.length > 0) {
          this.firmwares.forEach((r) => {
            let firmWareData = [];
            if (r.Id == this.currentFirmwareDetails.Id) {
              var date = new Date(r.ReleaseDate).toISOString().slice(0, 19);
              firmWareData['id'] = r.Id;
              firmWareData['value'] = `${r.VersionNo} (${date})-Current`;
              firmWareData['selected'] = 1;
              variantInfo['Releases'].push(firmWareData);
            } else {
              var date = new Date(r.ReleaseDate).toISOString().slice(0, 19);
              firmWareData['id'] = r.Id;
              firmWareData['value'] = `${r.VersionNo} (${date})`;
              firmWareData['selected'] = 0;
              firmWareData['disabled'] = 0;
              //  if(r.Id > this.currentFirmwareDetails.Id) {
              //   firmWareData['disabled'] = 0;
              //  } else {
              //   firmWareData['disabled'] = 1;
              //  }
              variantInfo['Releases'].push(firmWareData);
            }
          });
        }
      }
      this.variantDetails.push(variantInfo);
    });
  }

  openNewRelease(tid, variantId, releaseId) {
    const dialogRef = this.dialog.open(CreateFirmwareDialog, {
      width: '300px',
      minHeight: '280px',
      data: { TID: tid, variantId: variantId, release: releaseId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.variantDetails = [];
      this.ngOnInit();
    });
  }

  setCurrent(tid, variantId, releaseId) {
    if (releaseId <= this.currentFirmwareDetails.Id) {
      this.loggerService.showErrorMessage(
        `Selected release id cannot be less than the current release id.`
      );
      return;
    }
    if (releaseId != null) {
      this.templateService
        .setVariantCurrentFirmWare(tid, variantId, releaseId)
        .subscribe(
          (data) => {
            this.loggerService.showSuccessfulMessage(
              'Current firmware updated successfully!'
            );
            this.variantDetails = [];
            this.ngOnInit();
          },
          (error) => {
            this.loggerService.showErrorMessage(
              'Setting current firmware failed!'
            );
          }
        );
    }
  }

  displayReleaseDetails(variantId, releaseId) {
    this.valueSelected = true;
    let firmware = this.firmwares.filter((x) => x.Id == releaseId);
    if (firmware != null) {
      this.selectedVersion = firmware[0].VersionNo;
      this.selectedReleaseDate = firmware[0].ReleaseDate;
      this.selectedSize = firmware[0].Size;
      this.selectedMD5 = firmware[0].FirmwareMD5;
      this.selectedUrl = firmware[0].Url;
    }
  }
}
