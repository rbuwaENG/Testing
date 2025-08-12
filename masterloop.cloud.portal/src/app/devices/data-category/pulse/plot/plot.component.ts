import * as moment from 'moment';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { DateExtension } from '../../../../core/extensions';
import { PulseService, LoggerService, DeviceService, IndexedDbService, SiteSetting } from '../../../../services';
import { PulseComponent } from '../pulse.component';
import { LocalStorageService } from './../../../../services/local-storage.service';

@Component({
    selector: 'app-pulse-plot',
    templateUrl: './plot.component.html',
    styleUrls: ['./plot.component.scss']
})
export class PulsePlotComponent extends PulseComponent {

    customTo: any;
    customFrom: any;
    pulseValues: any = {
        title: { text: ' ' },
        series: [],
        chart: {
            zoomType: 'x'
        }
    };
    defaultPulses: any = {
        DevicePulse: "Device Pulse"
    };

    constructor(
        protected route: ActivatedRoute,
        protected pulseService: PulseService,
        protected loggerService: LoggerService,
        protected cache: LocalStorageService,
        protected deviceService: DeviceService,
        protected indexedDbService : IndexedDbService,
        protected siteSetting: SiteSetting,
    ) {
        super(route, loggerService, pulseService, cache, deviceService, indexedDbService, siteSetting);
    }

    protected onPreDataFetch(): void {
        this.pulseValues.series.splice(0, this.pulseValues.series.length);
        this.pulseValues.series = [... this.pulseValues.series];
    }

    protected onDataReceivedSuccess(data: any): void {
        data.Data = data.Data.reduce((current: any[], elem: any) => {
            current.push([DateExtension.getTimestampAsMilliseconds(elem.From), 0]);
            current.push([DateExtension.getTimestampAsMilliseconds(elem.To), 0]);
            current.push([DateExtension.getTimestampAsMilliseconds(elem.To), null]);
            return current;
        }, []);

        if (this.isPulseExist(data.PulseName) == null) {
            this.allPulses.push(data);
        }
        this.allPulses.forEach(pulse => {
            //let name = (pulse.PulseName) + "-" + (pulse.PulseId + 1);
            let name = (pulse.PulseName);
            this.names.push(name);
            this.names.sort()
            let pulseData = [];
            if (pulse.Data != null) {
                pulse.Data.forEach(item => {                   
                    if (item != null) {
                        //set pulse id and null for duplicate "To" values
                        var duplicate = pulseData.find(element => element[0] == item[0]);
                        if (duplicate == null) {
                            item[1] = pulse.PulseId;                         
                        }
                        pulseData.push(item);                     
                    }
                });
            }

            //set default color for device pulse
            let color = (name == this.defaultPulses.DevicePulse) ? "" : this.getColorByPulseId(pulse.PulseId);
            let chart = {
                name: name,
                color: color,
                data: pulseData,
                lineWidth: 1,
                fillOpacity: 1,
                marker: {
                    symbol: "url(./assets/images/pulse-marker.png)",
                    enabled: true
                }
            };
            this.chartSeries.push(chart);
            this.sortPulsesByName();
        });
        let hasData = ((data.Data.length) ? true : false);
        if (hasData) this.activePulses.push(hasData);
        this.pulseValues = Object.assign({}, this.pulseValues, {
            hasData: hasData,
            series: this.chartSeries,
            line: {
                color: ['#0000FF']
            },
            legend: {
                enabled: true,
                padding: 0,
                align: 'center'
            },
            credits: {
                enabled: false
            },
            xAxis: {
                type: 'datetime',
                minorGridLineWidth: 1
            },
            yAxis: {
                max : this.names.length,
                min : -1,
                title: {
                    text: [this.names]
                },
                allowDecimals: false,
                // labels: {
                //     style: {
                //         fontSize: '15px',
                //         width: '50px'
                //     }
                // }
            }
        });
    }

    protected sortPulsesByName() {
        this.chartSeries.sort(function (a, b) {
            if (a.name < b.name) { return -1; }
            if (a.name > b.name) { return 1; }
            return 0;
        });
    }

    protected isPulseExist(pulseName: string): any {
        let name = null;
        let allPulses = this.allPulses;
        if (allPulses != null) {
            for (let chart of allPulses) {
                if (chart.PulseName === pulseName) {
                    name = pulseName;
                    break;
                }
            }
        }
        return name;
    }

    protected getColorByPulseId(pulseId: any): string {
        let color = "#007dbd"
        switch (pulseId) {
            case 1:
                color = "#FF0000";
                break;
            case 2:
                color = "#0000CD";
                break;
            case 3:
                color = "#008000";
                break;
            case 4:
                color = "#000000";
                break;
            case 5:
                color = "#800000";
                break;
            case 6:
                color = "#00FF7F";
                break;
            case 7:
                color = "#008080";
                break;
            case 8:
                color = "#1E90FF";
                break;
            case 9:
                color = "#9400D3";
                break;
            case 10:
                color = "#C71585";
                break;
            default:
                color = "#007dbd";

        }
        return color;
    }
}
