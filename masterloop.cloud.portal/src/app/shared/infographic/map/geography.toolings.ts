export class GeographyPoint {
    Latitude: number;
    Longitude: number;

    constructor(latitude: number, longitude: number) {
        this.Latitude = latitude;
        this.Longitude = longitude;
    }
}

export class GeographyToolings {
    protected static readonly sm_a = 6378137.0;
    protected static readonly sm_b = 6356752.314;

    public static DegToRad(deg) { return (deg / 180.0 * Math.PI); }
    public static RadToDeg(rad) { return (rad / Math.PI * 180.0); }

    public static GetRhumbBearing(start: GeographyPoint, end: GeographyPoint) {
        var dLat = this.DegToRad(end[1] - start[1]);
        var dLon = this.DegToRad(end[0] - start[0]);

        var lat1 = this.DegToRad(start[1]);
        var lon1 = this.DegToRad(start[0]);
        var lat2 = this.DegToRad(end[1]);
        var lon2 = this.DegToRad(end[0]);

        var dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
        if (Math.abs(dLon) > Math.PI) {
            dLon = dLon > 0 ? -(2 * Math.PI - dLon) : (2 * Math.PI + dLon);
        }
        return this.RadToDeg(Math.atan2(dLon, dPhi));
    }

    public static GetRhumbDestination(start: GeographyPoint, bearing: number, distance: number): any {
        let d = distance / this.sm_a;
        let b = this.DegToRad(bearing);
        let lat1 = this.DegToRad(start[1]);
        let lon1 = this.DegToRad(start[0]);
        let lat2, lon2;
        lat2 = lat1 + d * Math.cos(b);
        let dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
        let q = (Math.abs(lat2 - lat1) > 1e-10) ? (lat2 - lat1) / dPhi : Math.cos(lat1);
        let dLon = d * Math.sin(b) / q;
        if (Math.abs(lat2) > Math.PI / 2) lat2 = lat2 > 0 ? Math.PI - lat2 : -Math.PI - lat2;
        lon2 = (lon1 + dLon + Math.PI) % (2 * Math.PI) - Math.PI;

        var obj = [];
        obj.push(this.RadToDeg(lon2));
        obj.push(this.RadToDeg(lat2));
        return obj;
    }
}