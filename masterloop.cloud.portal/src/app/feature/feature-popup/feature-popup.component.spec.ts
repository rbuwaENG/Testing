import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturePopupComponent } from './feature-popup.component';

describe('FeaturePopupComponent', () => {
  let component: FeaturePopupComponent;
  let fixture: ComponentFixture<FeaturePopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FeaturePopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeaturePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
