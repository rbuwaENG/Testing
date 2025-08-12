import { Routes } from "@angular/router";
import { NotFoundComponent, UnexpectedComponent, UnauthorizedComponent } from '.';

export const ErrorRoutes: Routes = [
  {
    path: '',
    children: [{
      path: '404',
      component: NotFoundComponent
    }, {
      path: 'unexpected',
      component: UnexpectedComponent
    }, {
      path: 'unauthorized',
      component: UnauthorizedComponent
    }]
  }
];
