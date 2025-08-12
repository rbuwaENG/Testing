import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StatPlotComponent } from './stat-plot.component';

describe('StatPlotComponent', () => {
  let component: StatPlotComponent;
  let fixture: ComponentFixture<StatPlotComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StatPlotComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StatPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
