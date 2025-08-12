/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { UnexpectedComponent } from './unexpected.component';

describe('UnexpectedComponent', () => {
  let component: UnexpectedComponent;
  let fixture: ComponentFixture<UnexpectedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UnexpectedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UnexpectedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
