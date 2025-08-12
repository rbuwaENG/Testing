
/**
 * Color gradient definition ...
 */
export interface IColorGradient {
    [stop: number]: string;
}

/**
 * Color gradient object...
 */
export class ColorGradient {
    private _raw: IColorGradient;
    /* returns raw object definition */
    public get raw(): IColorGradient { return this._raw; }
    /* sets definition from object */
    public set raw(value: IColorGradient) {
        this._raw = value;
        this._rawArray = Object.keys(this._raw)
            .map((current, idx, source) => <[number, string]>[+current, this._raw[current]])
            .sort((current, next) => current[0] - next[0]);
    }

    private _rawArray: [number, string][];
    /* returns definitions as array */
    public get rawArray(): [number, string][] { return this._rawArray; }
    /* sets definition from array. */
    public set rawArray(value: [number, string][]) {
        this.raw = value.sort((current, next) => current[0] - next[0]).reduce((result, current) => {
            result[current[0]] = current[1];
            return result;
        }, {});
    }

    protected constructor() { }

    /**
     * fills gradient stops into canvas-gradient.
     * @param canvasGradient target to fill/copy into.
     */
    public fillTo(canvasGradient: CanvasGradient): CanvasGradient {
        this._rawArray.forEach(m => canvasGradient.addColorStop(m[0], m[1]));
        return canvasGradient;
    }

    public asHTMLLinearGradientDefinitionString (): string {         
        return this._rawArray.map(m => `${m[1]} ${m[0]*100}%`).join(', ');
    }

    /**
     * creates gradient object from definition.
     * @param value definition as object or array.
     */
    public static from(value: IColorGradient | [number, string][]): ColorGradient {
        var result = new ColorGradient();
        (value instanceof Array) ? result.rawArray = <any>value : result.raw = <any>value;
        return result;
    }
}
