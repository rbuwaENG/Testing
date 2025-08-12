import { NotifyableArray } from './notifyable-array';

export class ObservationStruct {
  public Id: number;
  public _values: NotifyableArray;
  public _fetchingValuesPormise: Promise<any>;
  public get _isLoading(): boolean {
    return !!this._fetchingValuesPormise;
  }

  constructor(observationRaw?: any) {
    this._values = new NotifyableArray();
    Object.assign(this, observationRaw || {});
  }
}
