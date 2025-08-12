import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MdIconModule, MdCardModule, MdInputModule, MdCheckboxModule, MdButtonModule } from "@angular/material";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from "@angular/flex-layout";

import { ErrorRoutes, NotFoundComponent, UnexpectedComponent, UnauthorizedComponent } from '.';


@NgModule({
  imports: [
    CommonModule, 
    RouterModule.forChild(ErrorRoutes), 
    MdIconModule, 
    MdCardModule, 
    MdInputModule, 
    MdCheckboxModule, 
    MdButtonModule, 
    FlexLayoutModule, 
    FormsModule, 
    ReactiveFormsModule],
  declarations: [
    NotFoundComponent, 
    UnexpectedComponent,
    UnauthorizedComponent]
})

export class ErrorModule {}