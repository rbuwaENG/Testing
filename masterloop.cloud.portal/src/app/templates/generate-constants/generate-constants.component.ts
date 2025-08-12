import { Component } from '@angular/core';
import { LoggerService, TemplateService } from '../../services';
import { ActivatedRoute } from '@angular/router';
import { LanguageType } from '../../core/enums/language_types';
import { C } from './cpp';
import { Python } from './python';
import { Csharp } from './csharp';

@Component({
  selector: 'app-template-constants',
  templateUrl: './generate-constants.component.html',
  styleUrls: ['./generate-constants.component.scss'],
})
export class GenerateConstantsComponent {
  TID: any;
  templateDetails = {};

  constructor(
    private route: ActivatedRoute,
    private templateService: TemplateService,
    private loggerService: LoggerService
  ) {}

  public types = [
    { id: LanguageType.CSharp, name: 'C#' },
    { id: LanguageType.CPP, name: 'C' },
  ];

  onTypeChange(event) {
    if (event.value == null) {
      this.loggerService.showErrorMessage('Please select a document type!');
      return;
    }
    let selectedLanguage;
    this.route.params.subscribe((data) => {
      this.TID = data['id'];
      let type = event.value;
      this.templateService.getTemplateDetails(this.TID).subscribe((data) => {
        this.templateDetails = data;
        selectedLanguage = this.switchLanguageType(type);
        this.downloadFile(selectedLanguage.content, type);
      });
    });
  }

  protected switchLanguageType(type) {
    switch (type) {
      case LanguageType.CPP:
        return new C(this.templateDetails);
      case LanguageType.Python:
        return new Python();
      case LanguageType.CSharp:
        return new Csharp(this.templateDetails);
    }
  }

  downloadFile(data, type) {
    var nameOfFileToDownload: string;
    if (type == LanguageType.CPP) {
      nameOfFileToDownload = `${this.TID}.h`;
    } else {
      nameOfFileToDownload = `${this.TID}.cs`;
    }

    var blob = new Blob([data], { type: 'data:text/plain;charset=utf-8' });

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, nameOfFileToDownload);
    } else {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nameOfFileToDownload;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}
