export class DeviceMapReasonsInfo {

    public static readonly reasons = [
        { "id": 3, "name": "Online Now", "color": "#5CA909" },
        { "id": 2, "name": "Recently Online", "color": "#F5A623" },
        { "id": 1, "name": "Offline", "color": "#D0021B" }
    ];

    static readonly ObservationWarning = 'Allow select maximum 10 observations only !';
    static readonly SettingWarning = 'Allow select maximum 10 settings only !';
    static readonly NoObservations = 'Please select at least one observation!';
    static readonly NoDevices = 'No any devices associated with this template !';
}