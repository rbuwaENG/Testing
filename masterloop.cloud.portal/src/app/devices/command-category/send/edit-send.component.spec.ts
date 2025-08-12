/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EditSendComponent } from './edit-send.component';

describe('EditSendComponent', () => {
  let component: EditSendComponent;
  let fixture: ComponentFixture<EditSendComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditSendComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditSendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
