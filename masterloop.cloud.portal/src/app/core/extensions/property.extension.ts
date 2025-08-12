export class PropertyExtension {
    constructor() { throw new Error("Cannot new this class"); }

    /* http://stackoverflow.com/questions/33547583/safe-way-to-extract-property-names-in-typescript */
    static getPropertyName(propertyFunction: Function) {
        return /\.([^\.;]+);?\s*\}$/.exec(propertyFunction.toString())[1];
    }
}
