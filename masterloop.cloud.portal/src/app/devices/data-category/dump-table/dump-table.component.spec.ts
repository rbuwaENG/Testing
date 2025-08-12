/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DumpTableComponent } from './dump-table.component';

describe('DumpTableComponent', () => {
  let component: DumpTableComponent;
  let fixture: ComponentFixture<DumpTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DumpTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DumpTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
