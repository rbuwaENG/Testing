export class OAuthTokenMetadata {
  public _token: string;
  protected _type: string;
  protected _expiresIn: number;

  public get token(): string {
    return this._token;
  }
  public get type(): string {
    return this._type;
  }
  public get expiresIn(): number {
    return this._expiresIn;
  }
  protected get isEmpty(): boolean {
    return !this._token && !this._type && !this._expiresIn;
  }

  protected empty(): void {
    this._token = null;
    this._type = null;
    this._expiresIn = null;
  }

  constructor() {}

  static parseFromServer(source: any): OAuthTokenMetadata {
    return Object.assign(new OAuthTokenMetadata(), {
      _token: source.access_token,
      _type: source.token_type,
      _expiresIn: source.expires_in,
    });
  }
}
