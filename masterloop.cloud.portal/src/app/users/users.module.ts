import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserListComponent } from './user-list/user-list.component';
import { UsersRoutingModule } from "./users-routing.module";
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { SharedModule } from '../shared/shared.module';
import { UserEditComponent } from './user-edit/user-edit.component';
import { UserCreateInviteComponent } from './user-create-invite/user-create-invite.component';


@NgModule({
  declarations: [UserListComponent, UserEditComponent, UserCreateInviteComponent],
  imports: [
    CommonModule,
    UsersRoutingModule,
    NgxDatatableModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    SharedModule,
  ]
})
export class UserModule { }
