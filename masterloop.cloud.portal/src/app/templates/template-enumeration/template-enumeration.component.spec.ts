import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateEnumerationComponent } from './template-enumeration.component';

describe('TemplateEnumerationComponent', () => {
  let component: TemplateEnumerationComponent;
  let fixture: ComponentFixture<TemplateEnumerationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplateEnumerationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplateEnumerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
