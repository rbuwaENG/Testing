import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantUserPermissionComponent } from './tenant-user-permission.component';

describe('TenantUserPermissionComponent', () => {
  let component: TenantUserPermissionComponent;
  let fixture: ComponentFixture<TenantUserPermissionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TenantUserPermissionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TenantUserPermissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
