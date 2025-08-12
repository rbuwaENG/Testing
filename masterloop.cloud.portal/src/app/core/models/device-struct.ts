export class DeviceStruct {
    public MID: string;
    public _observations: any[];
    public _selectedObservations: any[];
    public _fetchingObservationsPormise: Promise<any>;
    public _showObservations: boolean;
    public get _isObservationsLoading(): boolean { return !!this._fetchingObservationsPormise; };

    constructor(deviceRaw?: any) {
        Object.assign(this, deviceRaw || {});
    }
}