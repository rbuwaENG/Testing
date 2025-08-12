import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SecurityPopupComponent } from './security-popup.component';

describe('SecurityPopupComponent', () => {
  let component: SecurityPopupComponent;
  let fixture: ComponentFixture<SecurityPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SecurityPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SecurityPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
