import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-reload-content',
  templateUrl: './reload-content-component.component.html',
  styleUrls: ['./reload-content-component.component.css']
})

export class ReloadContentComponent {
  @Output()
  public reload: EventEmitter<boolean>;

  constructor() {
    this.reload = new EventEmitter();
  }

  public onReload() {
    this.reload.emit(true);
  }
}
