import { BrowserModule } from "@angular/platform-browser";
import { APP_INITIALIZER, NgModule } from "@angular/core";
import { HashLocationStrategy, LocationStrategy } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule, HttpClient } from "@angular/common/http";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { FlexLayoutModule } from "@angular/flex-layout";
import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
// import { MomentModule } from 'angular2-moment';
// import { FileUploadModule } from 'ng2-file-upload';

import { AppRoutingModule } from "./app-routing.module";
import { SharedModule } from "./shared/shared.module";
import { InterceptorModule } from "./core/http/interceptors";
import { AnonymousGuard, AuthenticatedGuard } from "./core/route-guards";
import { CanDeactivateGuard } from "./core/route-guards/can-deactivate-guard";
import { AppComponent } from "./app.component";
import {
  AnonymousLayoutComponent,
  AdminLayoutComponent,
  AuthLayoutComponent,
} from "./layouts";
import { SignOutDirective } from "./account";
import { ConfirmDialogComponent } from "./confirm-dialog/confirm-dialog.component";
import { ObservationOverflowDialog } from "./devices/data-category/observations/observation-dialog.component";
import { DumpTableOverflowDialog } from "./devices/data-category/dump-table/dump-table-dialog.component";
import { CommandHistoryModalComponent } from "./devices/command-category/command-history-modal/command-history-modal.component";
import { ChartModule } from 'angular2-highcharts';
import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
import { ObservationStatOverflowDialog } from 'src/app/analyzer/observations-table/observation-stat-dialog.component';
import { LatestOverflowDialog } from "./devices/data-category/multiple-observations/latest-overflow.component";
import { CreateFirmwareDialog } from "./templates/firmware-manager/create-firmware-dialog.component";
import { EventTableOverflowComponent } from "./devices/data-category/event/table/event-table-dialog.component";

import * as Highcharts from 'highcharts';
import * as darkTheme from 'highcharts/themes/dark-unica';
declare var require: any;
require('highcharts/highcharts-more')(Highcharts);
import { DBConfig } from 'ngx-indexed-db';
import { NgxIndexedDBModule } from 'ngx-indexed-db';
import { ConfigService } from './config.service';
import { MenuUpdateService } from './services/menu-update.service';
import { TemplateImportComponent } from './templates/template-import/template-import.component';
import { NgxTextDiffModule } from 'ngx-text-diff';
import { ClipboardModule } from "ngx-clipboard";
import { LayoutComponent } from './layouts/layout-component/layout.component';
import { userPermissionService } from './services/user-permission.service';
import { UserService } from './services/user.service';
import { FeaturePopupComponent } from './feature/feature-popup/feature-popup.component';
import { LocalStorageKeys } from "./core/constants/local-storage-keys";

export function initConfig  (configService: ConfigService) {
  return () =>configService.setConfig();
};

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

export function highchartsFactory() {
  return Highcharts;
}

export function additionalHighchartsModules() {
  //load highcharts dark theme conditionaly
  const DARK_THEME = 'app-dark';
  return (localStorage.getItem(LocalStorageKeys.COLOR_THEME) === DARK_THEME) ? [darkTheme(Highcharts)] : [];
}

const dbConfig: DBConfig  = {
  name: 'mcs',
  version: 1,
  objectStoresMeta: [{
    store: 'devices',
        storeConfig: { keyPath: 'Id', autoIncrement: false },
        storeSchema: [
          { name: 'Id', keypath: 'Id', options: { unique: false } },
          { name: 'Value', keypath: 'Value', options: { unique: false } }
        ]
  }]
};

@NgModule({
  declarations: [
    AppComponent,
    AnonymousLayoutComponent,
    AdminLayoutComponent,
    AuthLayoutComponent,
    SignOutDirective,
    ConfirmDialogComponent,
    ObservationOverflowDialog,
    DumpTableOverflowDialog,
    CommandHistoryModalComponent,
    ObservationStatOverflowDialog,
    LatestOverflowDialog,
    CreateFirmwareDialog,
    TemplateImportComponent,
    LayoutComponent,
    EventTableOverflowComponent,
    FeaturePopupComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    InterceptorModule,
    FlexLayoutModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    SharedModule,
    ChartModule.forRoot(Highcharts),
    NgxIndexedDBModule.forRoot(dbConfig),
    ReactiveFormsModule,
    NgxTextDiffModule,
    ClipboardModule
    // MomentModule,
    // FileUploadModule
  ],
  providers: [
    MenuUpdateService,
    UserService,
    userPermissionService,
    AnonymousGuard,
    AuthenticatedGuard,
    CanDeactivateGuard,
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy,
    },
    {
      provide: HighchartsStatic,
      useFactory: highchartsFactory
    },
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initConfig,
      multi: true,
      deps: [ConfigService]
    }
  ],
  entryComponents: [
    ConfirmDialogComponent,
    ObservationOverflowDialog,
    DumpTableOverflowDialog,
    CommandHistoryModalComponent,
    ObservationStatOverflowDialog,
    LatestOverflowDialog,
    CreateFirmwareDialog,
    TemplateImportComponent,
    EventTableOverflowComponent
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
