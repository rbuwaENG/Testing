import { ReplaySubject, Subject, Observable } from "rxjs";

/**
 * This provides feature to listen for value changes, when the value property is modified.
 */
export class NotifyableObject<T> {
    /* Holds object's value... */
    protected value: T;
    /* To stream value changes... */
    protected subject: Subject<T>;

    /* Exposes observable to listen to value changes ...  */
    public get valueChanges(): Observable<T> {
        return this.subject.asObservable();
    }

    constructor() {
        this.subject = new Subject<T>();
    }

    /* Retreives value.... */
    public getValue(): T {
        return this.value;
    }
    /* Updates value and pushes the new value to the listeners... */
    public setValue(value: T): void {
        this.subject.next(this.value = value);
    }
}