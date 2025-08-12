export class StringExtension {
    constructor() { throw new Error("Cannot new this class"); }

    public static toTitleCase(value): string {
        return value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    public static toSnakeCase(value): string {
        return  !value ? value : value.replace(' ', '_').toLowerCase();
    }

    public static fromSnakeCase(value): string {
        return  !value ? value : value.replace('_', ' ');
    }
}
