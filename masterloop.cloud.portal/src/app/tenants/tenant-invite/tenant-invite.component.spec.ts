import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantInviteComponent } from './tenant-invite.component';

describe('TenantInviteComponent', () => {
  let component: TenantInviteComponent;
  let fixture: ComponentFixture<TenantInviteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TenantInviteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TenantInviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
