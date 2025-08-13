import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SigninComponent } from './signin/signin.component';
import { ForgotComponent } from './forgot/forgot.component';
import { ResetComponent } from './reset/reset.component';
import { TwoFactorAuthComponent } from './two-factor-auth/two-factor-auth.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'signin',
        component: SigninComponent
      },
      {
        path: 'forgot',
        component: ForgotComponent
      },
      {
        path: 'reset-password',    
        component: ResetComponent
      },
      {
        path: 'two-factor-auth',
        component: TwoFactorAuthComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule {}
