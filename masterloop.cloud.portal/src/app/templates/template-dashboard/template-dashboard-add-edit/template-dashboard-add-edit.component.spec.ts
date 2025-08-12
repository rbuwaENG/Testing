import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateDashboardAddEditComponent } from './template-dashboard-add-edit.component';

describe('TemplateDashboardAddEditComponent', () => {
  let component: TemplateDashboardAddEditComponent;
  let fixture: ComponentFixture<TemplateDashboardAddEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplateDashboardAddEditComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplateDashboardAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
