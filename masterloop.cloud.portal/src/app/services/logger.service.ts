import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { AppSettings } from './app.settings';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private actionLabel: string;
  private snackBarConfig: MatSnackBarConfig;

  constructor(private settings: AppSettings, private snackBar: MatSnackBar) {
    this.actionLabel = settings.snackbar_action_label;
    this.snackBarConfig = {
      duration: settings.snackbar_duration
    };
  }

  public showErrorMessage(message: string) {
    this.snackBar.open(message, this.actionLabel, this.snackBarConfig);
  }

  public showWarningMessage(message: string) {
    this.snackBar.open(message, this.actionLabel, this.snackBarConfig);
  }

  public showSuccessfulMessage(message: string) {
    this.snackBar.open(message, this.actionLabel, this.snackBarConfig);
  }
}
