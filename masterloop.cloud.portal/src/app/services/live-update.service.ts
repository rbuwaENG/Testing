import { Injectable } from '@angular/core';

import { AppSettings } from './app.settings';
import { DateExtension } from '../core/extensions';
import { LiveConnectionService } from './live-connection.service';
import { LoggerService } from './logger.service';
import {
  LiveSubscriber,
  LiveConnectRequest,
  LiveConnectResponse,
} from '../core/models';

declare var Stomp: any;

@Injectable({
  providedIn: 'root',
})
export class LiveUpdateService {
  //protected ws: WebSocket;
  protected client: any;
  public connected: boolean = false;
  public liveConnectionRequestBody: LiveConnectRequest[];

  subscriber: LiveSubscriber;
  subscription: any;

  constructor(
    private appSettings: AppSettings,
    private loggerService: LoggerService,
    private liveConnectionService: LiveConnectionService
  ) {}

  connect() {
    if (this.liveConnectionRequestBody && !this.connected) {
      this.liveConnectionService
        .getLiveConnectionDetails(this.liveConnectionRequestBody)
        .subscribe(
          (data) => {
            if (this.appSettings.api_version == '5') {
              var broker_url =
                'wss://' + data.Server + ':' + this.appSettings.live_port;
            } else {
              var broker_url =
                'wss://' +
                data.Server +
                ':' +
                this.appSettings.live_port +
                '/ws';
            }
            let ws = new WebSocket(broker_url);
            this.client = Stomp.over(ws);
            // RabbitMQ SockJS does not support heartbeats so disable them
            // this.client.heartbeat.outgoing = 0;
            // this.client.heartbeat.incoming = 0;
            this.client.debug = null;

            this.client.connect(
              data.Username,
              data.Password,
              (d, e) => {
                this.onConnect(d, data.QueueName);
              },
              (d) => {
                this.onError(d);
              },
              data.VirtualHost
            );
          },
          (error) => {
            if (error && error.status === 401) {
              this.loggerService.showErrorMessage(
                "Don't have access to live subscription"
              );
            } else {
              this.loggerService.showErrorMessage(
                'Error occurred while retrieving live connection details'
              );
            }
          }
        );
    }
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.client) {
      this.client.disconnect(this.onDisconnect());
    }
  }

  onDisconnect() {
    this.connected = false;
    // console.log("disconnected");
  }

  onConnect(data: any, queue: string) {
    this.connected = true;
    this.subscription = this.client.subscribe(
      '/amq/queue/' + queue,
      (payload) => this.onMessage(payload)
    );
  }

  onError(data: any) {
    this.loggerService.showErrorMessage(
      'Error occurred while retrieving live data'
    );
  }

  onMessage(payload: any) {
    //console.log(payload);
    if (this.subscriber) {
      this.subscriber.update(payload.body, payload.headers);
    }
  }

  addSubscriber(subscriber: any) {
    if (subscriber) {
      this.subscriber = subscriber;
    }
  }
}
