/**
 * Wrapper classes for maintaining select state of an object ...
 */
export class SelectableObject<T> {
    public value: T;
    public isSelected: boolean;

    constructor(value: T, isSelected?: boolean) {
        this.value = value;
        this.isSelected = isSelected || false ;
    }
}