export class LiveSubscriber {

    deviceSerial: string;
    observationId: string;
    dataType: number;

    updateCallback: any;

    constructor(serial, observation, dataType) {
        this.deviceSerial = serial;
        this.observationId = observation;
        this.dataType = dataType;
    }

    update(messageBody: any, messageHeader : any) {
        let data = this.getData(JSON.parse(messageBody));
        if(this.updateCallback) {
            this.updateCallback(data, messageHeader);
        }
    }

    private getData(data: any): any {
        if (this.dataType == 5) {
            data = {
                Timestamp: data.Timestamp,
                Longitude: data.Value.Longitude,
                Latitude: data.Value.Latitude,
                Altitude: data.Value.Altitude
            };
        }
        // else{

        //     data = {
        //         Timestamp: timestamp,
        //         Value : Number(value)
        //     }
        // }
        return data;
    }
}