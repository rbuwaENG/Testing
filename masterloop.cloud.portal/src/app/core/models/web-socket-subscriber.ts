import { Observable, Subscription, Subject } from 'rxjs';
import { AppSettings, LiveConnectionService } from '../../services';
import { LiveConnectRequest } from '.';

declare var Stomp: any;

export class WebSocketSubscriber {
  private _client: any;
  private _webSocketSubscription: Subscription;
  private _connectRequestOptions: LiveConnectRequest[];
  private _connectionPromise: Promise<WebSocketSubscriber>;
  private _messages: Subject<any>;
  public get messageStream(): Observable<any> {
    return this._messages.asObservable();
  }
  public get isConnected(): boolean {
    return !!this._webSocketSubscription;
  }

  constructor(
    private appSettings: AppSettings,
    private liveConnectionService: LiveConnectionService
  ) {}

  public connect(options: LiveConnectRequest[]): Promise<WebSocketSubscriber> {
    if (this._connectionPromise) {
      return this._connectionPromise;
    }

    this._connectionPromise = new Promise<WebSocketSubscriber>(
      (resolve, reject) => {
        if (this._webSocketSubscription) {
          return reject(
            'client is already connect to live. if your topic options differ, please disconnect and connect again.'
          );
        }
        if (!options) {
          return reject('options invalid.');
        }
        this.liveConnectionService
          .getLiveConnectionDetails((this._connectRequestOptions = options))
          .subscribe(
            (data) => {
              let url = 'ws';
              if (this.appSettings.secure_live_connection) {
                url = 'wss';
              }
              if (this.appSettings.api_version == '5') {
                var broker_url =
                  url + '://' + data.Server + ':' + this.appSettings.live_port;
              } else {
                var broker_url =
                  url +
                  '://' +
                  data.Server +
                  ':' +
                  this.appSettings.live_port +
                  '/ws';
              }
              //"wss://" + data.Server + ":443/ws";
              this._client = Stomp.over(new WebSocket(broker_url));
              this._client.debug = null;
              this._client.connect(
                data.Username,
                data.Password,
                (value: any) => {
                  this._messages = new Subject<any>();
                  this._webSocketSubscription = this._client.subscribe(
                    `/amq/queue/${data.QueueName}`,
                    (message: any) => {
                      this._messages.next({
                        headers: message.headers,
                        body: JSON.parse(message.body || '{}'),
                      });
                    }
                  );
                  resolve(this);
                },
                (error: any) => {
                  this._messages.error(error);
                  reject('Error occurred while retrieving live data');
                },
                data.VirtualHost
              );
            },
            (error) => {
              reject(
                error && error.status === 401
                  ? "Don't have access to live subscription"
                  : 'Error occurred while retrieving live connection details'
              );
            }
          );
      }
    )
      .then(
        (value: any) => {
          this._connectionPromise = null;
          return new Promise<WebSocketSubscriber>((resolve, reject) =>
            resolve(value)
          );
        },
        (error: any) => {
          this._connectionPromise = null;
          return new Promise<WebSocketSubscriber>((resolve, reject) =>
            reject(error)
          );
        }
      )
      .catch((error: any) => {
        this._connectionPromise = null;
        return new Promise<WebSocketSubscriber>((resolve, reject) =>
          reject(error)
        );
      });

    return this._connectionPromise;
  }

  disconnect() {
    if (!this._client || !this._webSocketSubscription) {
      return;
    }

    this._webSocketSubscription.unsubscribe();
    this._webSocketSubscription = null;
    this._messages = null;
    this._client.disconnect(() => {
      this._client = null;
    });
  }
}
