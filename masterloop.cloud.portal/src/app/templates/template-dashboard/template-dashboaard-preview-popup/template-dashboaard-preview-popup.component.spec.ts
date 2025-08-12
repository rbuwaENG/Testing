import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateDashboaardPreviewPopupComponent } from './template-dashboaard-preview-popup.component';

describe('TemplateDashboaardPreviewPopupComponent', () => {
  let component: TemplateDashboaardPreviewPopupComponent;
  let fixture: ComponentFixture<TemplateDashboaardPreviewPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplateDashboaardPreviewPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplateDashboaardPreviewPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
