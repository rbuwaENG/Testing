import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationAddEditComponent } from './observation-add-edit.component';

describe('ObservationAddEditComponent', () => {
  let component: ObservationAddEditComponent;
  let fixture: ComponentFixture<ObservationAddEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationAddEditComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
