import * as moment from 'moment';
import { OAuthTokenMetadata } from './oauth-token-metadata';

export class OAuthToken extends OAuthTokenMetadata {
  protected _lastModifiedAt: moment.Moment;
  protected _version: number;

  public get lastModifiedAt(): moment.Moment {
    return this._lastModifiedAt;
  }
  public get version(): number {
    return this._version;
  }
  public get expiresAt(): moment.Moment {
    return this.isEmpty || !this.lastModifiedAt
      ? null
      : this.lastModifiedAt.clone().add(this.expiresIn, 'seconds');
  }
  public get isValid(): boolean {
    return !!this.expiresAt && this.expiresAt > moment();
  }

  constructor(version: number) {
    super();
    this.empty();
    this._version = version;
  }

  /* Token from server has to be updated via this function only. */
  public update(newValues: OAuthTokenMetadata, version?: number): void {
    !newValues ? this.empty() : Object.assign(this, newValues);
    /* backsetting lastModifiedAt by a small margin to prevent, token being valid even its actual time has expired...  */
    this._lastModifiedAt = moment().add(-15, 'seconds');
    this._version = version || 0;
  }

  static JSONParseReviver(key: any, value: any): any {
    if (key === '_lastModifiedAt') {
      return !value ? value : moment(value);
    }
    return value;
  }
}
