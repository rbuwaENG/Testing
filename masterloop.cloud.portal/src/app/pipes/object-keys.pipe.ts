import { Pipe, PipeTransform } from '@angular/core';

/**
 * Returns all the keys in the object as array. If an invalid object is supplied an empty array is returned.
 * Example:
 *  yourObject = { a: 1, b: 2 }
 *  {{ yourObject | objectKeys }}
 *  returns ['a', 'b']
 */
@Pipe({ name: 'objectKeys' })
export class ObjectKeys implements PipeTransform {

    constructor() {}

    public transform(value: any): string[] {
        return Object.keys(value || {});
    }
}