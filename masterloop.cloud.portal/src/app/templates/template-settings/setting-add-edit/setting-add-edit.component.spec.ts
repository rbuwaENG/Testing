import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingAddEditComponent } from './setting-add-edit.component';

describe('SettingAddEditComponent', () => {
  let component: SettingAddEditComponent;
  let fixture: ComponentFixture<SettingAddEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SettingAddEditComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
