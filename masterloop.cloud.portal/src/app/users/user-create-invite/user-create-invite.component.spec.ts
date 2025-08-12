import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserCreateInviteComponent } from './user-create-invite.component';

describe('UserCreateInviteComponent', () => {
  let component: UserCreateInviteComponent;
  let fixture: ComponentFixture<UserCreateInviteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserCreateInviteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserCreateInviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
