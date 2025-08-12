import { Pipe, PipeTransform } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Pipe({ name: 'convertDecimal' })
export class ConvertDecimal implements PipeTransform {
  constructor(private _translateService: TranslateService) {}

  public transform(value: any): any {
    if (isNaN(value)) {
      return value;
    }
    return new DecimalPipe(this._translateService.currentLang).transform(value);
  }
}
