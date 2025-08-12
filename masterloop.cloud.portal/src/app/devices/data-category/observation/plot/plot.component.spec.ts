/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { PlotComponent } from './plot.component';

describe('ChartlibComponent', () => {
  let component: PlotComponent;
  let fixture: ComponentFixture<PlotComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlotComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
