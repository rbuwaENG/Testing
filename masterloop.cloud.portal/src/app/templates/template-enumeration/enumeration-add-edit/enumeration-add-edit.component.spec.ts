import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnumerationAddEditComponent } from './enumeration-add-edit.component';

describe('EnumerationAddEditComponent', () => {
  let component: EnumerationAddEditComponent;
  let fixture: ComponentFixture<EnumerationAddEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnumerationAddEditComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnumerationAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
