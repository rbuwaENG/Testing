
import { Component, OnInit, Input } from '@angular/core';
/* importing internals ... */
import { ColorGradient } from '../../../core/models';
import { isNumber } from 'util';

/**
 * Represents a legend item ...
 */
class LegendKey {
    protected data: any;
    public name: string;
    public color: string | ColorGradient;
    public get minValue() {  
        if((!this.data || this.data._minValue == null)) {
            return '';
        } else{
            if(this.data._minValue == 0) {
                return this.data._minValue; 
            }else if(isNumber(this.data._minValue) && (this.data._minValue > 0)) {
                return (Math.round(this.data._minValue * 100) / 100).toFixed(2);
            } else {
                return this.data._minValue; 
            }
           
        }
        // return (!this.data || this.data._minValue == null)  ? '' :  this.data._minValue; 
    };
    public get maxValue() {  
        if((!this.data || this.data._maxValue == null)) {
            return '';
        } else{
            if(this.data._maxValue == 0) {
                return this.data._maxValue; 
            }else if(isNumber(this.data._maxValue) && (this.data._maxValue > 0)) {
                return (Math.round(this.data._maxValue * 100) / 100).toFixed(2);
            } else {
                return this.data._maxValue; 
            }
        }

    };
    public get backgroundCSSStyle() {
        return !(this.color instanceof ColorGradient) ? this.color : `linear-gradient(to right, ${this.color.asHTMLLinearGradientDefinitionString()})`;
    }

    constructor(name: string, color: string | ColorGradient, data: any = null) {
        this.name = name;
        this.color = color;
        this.data = data;   
    }
}

@Component({
    selector: 'app-infograph-map-legend',
    templateUrl: './map-legend.component.html',
    styleUrls: ['./map-legend.component.css']
})
export class MapLegendComponent implements OnInit {

    @Input()
    graphicOptions: any;
    legendKeys: LegendKey[];

    constructor() {
        this.legendKeys = [];
    }

    public ngOnInit(): void {
        this.updateLegends();
    }

    public updateLegends(): void {
        this.legendKeys = Object.keys((this.graphicOptions || {}).devices || {}).reduce((result: LegendKey[], deviceId: any) => {
            Array.prototype.push.apply(result, Object.keys(this.graphicOptions.devices[deviceId]._valueObservations || {}).map(observationId => {
                return new LegendKey(
                    `${this.graphicOptions.devices[deviceId].MID} - ${this.graphicOptions.devices[deviceId]._valueObservations[observationId].Name}`,
                    this.graphicOptions.devices[deviceId]._valueObservations[observationId]._color,
                    this.graphicOptions.devices[deviceId]._valueObservations[observationId]);
            }));

            return result;
        }, []);
    }
}