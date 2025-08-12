import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnonymousLayoutComponent, AdminLayoutComponent } from './layouts';
import { AnonymousGuard, AuthenticatedGuard } from './core/route-guards';
import { AccountModule } from './account/account.module';
import { DeviceModule } from './devices/device.module';
import { TemplateModule } from './templates/templates.module';
import { AnalyzerModule } from './analyzer/analyzer.module';
import { TenantModule } from './tenants/tenants.module';
import { UserModule } from './users/users.module';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'devices/all',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: 'devices',
        // loadChildren: './devices/device.module#DeviceModule',
        loadChildren: () => DeviceModule,
        canLoad: [AuthenticatedGuard]
      },
      {
        path: 'templates',
        // loadChildren: './templates/templates.module#TemplateModule',
        loadChildren: () => TemplateModule,
        canLoad: [AuthenticatedGuard]
      },
      {
        path: 'analyzer',
        // loadChildren: './analyzer/analyzer.module#AnalyzerModule',
        loadChildren: () => AnalyzerModule,
        canLoad: [AuthenticatedGuard]
      },
      {
        path: 'tenants',
        // loadChildren: './analyzer/analyzer.module#AnalyzerModule',
        loadChildren: () => TenantModule,
        canLoad: [AuthenticatedGuard]
      },
      {
        path: 'users',
        // loadChildren: './analyzer/analyzer.module#AnalyzerModule',
        loadChildren: () => UserModule,
        canLoad: [AuthenticatedGuard]
      }
    ]
  },
  {
    path: '',
    component: AnonymousLayoutComponent,
    children: [
      {
        path: 'account',
        canLoad: [AnonymousGuard],
        // loadChildren: './account/account.module#AccountModule'
        loadChildren: () => AccountModule
      }
    ]
  },
  // {
  //   path: '',
  //   children: [
  //     {
  //       path: 'error',
  //       loadChildren: './error/error.module#ErrorModule'
  //     }
  //   ]
  // },
  // {
  //   path: '**',
  //   redirectTo: 'error/404'
  // }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
