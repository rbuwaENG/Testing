import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateImportComponent } from './template-import.component';

describe('TemplateImportComponent', () => {
  let component: TemplateImportComponent;
  let fixture: ComponentFixture<TemplateImportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplateImportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplateImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
