import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AppConfig } from '../app-config';
import { ConfigService } from '../config.service';
import { AddOnFeature } from '../core/enums/add-on-feature.enum';

@Injectable({
  providedIn: 'root',
})
export class AppSettings {
  public api_url: string;
  public api_version: string;
  public live_port: number;
  public readonly broker_virtual_host: string;
  public readonly broker_user: string;
  public readonly broker_password: string;
  public readonly broker_topic: string;
  public readonly broker_exchange: string;
  public readonly oauth_token_key: string;
  public readonly current_user_key: string;
  public readonly snackbar_action_label: string;
  public readonly snackbar_duration: number;
  public readonly auth_token_version: number;
  public readonly bing_maps_token: string;
  public readonly production_version: string;
  public readonly csv_lines_per_import_api_call: number;
  public readonly origin_application: string;
  public readonly secure_live_connection: boolean;

  config: AppConfig;

  constructor(private configLoaderService: ConfigService) {
    this.api_url = environment.api_url;
    this.api_version = environment.api_version;
    this.live_port = parseInt(environment.live_port);
    //this.broker_url = "ws://localhost:15674/ws";//"wss://live.masterloop.net:443/ws";//ws://crocodile.rmq.cloudamqp.com/ws";//"";
    //this.broker_url = 'wss://live.masterloop.net:443/ws';
    this.oauth_token_key = 'oauth_token';
    this.current_user_key = 'current_user';
    this.snackbar_action_label = 'close';
    this.snackbar_duration = 2000;
    this.auth_token_version = 1513331781;
    this.bing_maps_token =
      'AgJ4bLJlWyKVbp0O91oqkKbJyWw5d8iDdwmrjMEOD82U_PI4hIEqjyGhsR1oQq3y';
    this.production_version = 'v1.0';
    this.csv_lines_per_import_api_call = 1000;
    this.origin_application = 'MasterloopPortal';
    this.secure_live_connection = environment.live_connection_secured;
  }
  setValues(config) {
    //this.api_url = config.api_url;
    //this.api_version = config.api_version;
    //this.live_port = config.live_port;
  }
}
