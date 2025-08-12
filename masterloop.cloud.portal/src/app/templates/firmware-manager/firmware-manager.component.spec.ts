import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FirmwareManagerComponent } from './firmware-manager.component';

describe('FirmwareManagerComponent', () => {
  let component: FirmwareManagerComponent;
  let fixture: ComponentFixture<FirmwareManagerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FirmwareManagerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FirmwareManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
