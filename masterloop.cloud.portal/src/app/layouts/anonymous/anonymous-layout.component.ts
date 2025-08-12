import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  styles: [':host /deep/ .mat-sidenav-content {padding: 0;} mat-sidenav-layout {z-index: 4000}'],
  templateUrl: './anonymous-layout.component.html'
})
export class AnonymousLayoutComponent {}
