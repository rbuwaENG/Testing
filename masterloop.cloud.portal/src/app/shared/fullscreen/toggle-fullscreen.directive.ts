import { Directive, HostListener } from '@angular/core';
const screenfull = require('screenfull');

@Directive({
  selector: '[appToggleFullscreen]'
})
export class ToggleFullscreenDirective {

  @HostListener('click') onClick() {
    
    if (screenfull.isEnabled) {
      if(screenfull.isFullscreen) {
        screenfull.exit();
      } else {
        screenfull.request();
      }     
    } 
  }
}
