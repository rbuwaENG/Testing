export class LiveConnectRequest {
    MID: string;
    ConnectAllObservations: boolean;
    ConnectAllCommands: boolean;
    ObservationIds: number[];
    CommandIds: number[];
    InitObservationValues: boolean;
    ReceiveDevicePulse: boolean;
    PulseId: number;

    public constructor() {
        this.MID = null;
        this.ObservationIds = [];
        this.CommandIds = null;
        this.ConnectAllObservations = false;
        this.ConnectAllCommands = false;
        this.InitObservationValues = false;
        this.ReceiveDevicePulse = false;
        this.PulseId = null;
    }
}