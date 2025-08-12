import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'checkValue'
})
export class CheckValuePipe implements PipeTransform {

  transform(value: string): string {
      console.log(value);
      if(value) {
        return value;
      } else if(value == "") {
        return 'empty'
      } else if(value == null || value == undefined) {
          return 'void';
      }   
  }

}
