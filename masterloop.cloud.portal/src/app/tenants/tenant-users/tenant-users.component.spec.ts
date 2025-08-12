import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantUsersComponent } from './tenant-users.component';

describe('TenantUsersComponent', () => {
  let component: TenantUsersComponent;
  let fixture: ComponentFixture<TenantUsersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TenantUsersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TenantUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
