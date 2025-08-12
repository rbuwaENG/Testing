import { Observable, fromEventPattern } from 'rxjs';
import { NotifyableObject } from './notifyable-object';
/**
 * This provides feature to listen for value changes, when the value property is modified.
 */

interface ILiteEvent<T> {
  on(handler: { (data?: T): void }): void;
  off(handler: { (data?: T): void }): void;
}

class LiteEvent<T> implements ILiteEvent<T> {
  private handlers: { (data?: T): void }[] = [];

  public on(handler: { (data?: T): void }): void {
    this.handlers.push(handler);
  }
  public off(handler: { (data?: T): void }): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }
  public trigger(data?: T): void {
    this.handlers.slice(0).forEach((h) => h(data));
  }
  public expose(): ILiteEvent<T> {
    return this;
  }
}

export class NotifyableArray extends NotifyableObject<any[]> {
  protected readonly _itemsAdded: LiteEvent<any[]>;
  protected readonly _itemsRemoved: LiteEvent<any[]>;
  public get itemsAdded(): Observable<any[]> {
    return fromEventPattern(
      (h: any) => this._itemsAdded.on(h),
      (h: any) => this._itemsAdded.off(h)
    );
  }
  public get itemsRemoved(): Observable<any[]> {
    return fromEventPattern(
      (h: any) => this._itemsRemoved.on(h),
      (h: any) => this._itemsRemoved.off(h)
    );
  }

  constructor() {
    super();
    this.value = [];
    this._itemsAdded = new LiteEvent<any[]>();
    this._itemsRemoved = new LiteEvent<any[]>();
  }

  public push(items: any[]): number {
    items = Array.isArray(items) ? items : [items];
    var result = this.value.push(...items);
    this._itemsAdded.trigger(items);
    return result;
  }

  public unshift(items: any[]): number {
    var result = this.value.unshift(...items);
    this._itemsAdded.trigger(items);
    return result;
  }

  public pop(): any {
    var result = this.value.pop();
    this._itemsRemoved.trigger(result);
    return result;
  }

  public shift(): any {
    var result = this.value.shift();
    this._itemsRemoved.trigger(result);
    return result;
  }

  public splice(start: number, deleteCount?: number, items?: any[]): any[] {
    deleteCount = deleteCount || this.value.length;
    items = items || [];

    var result = this.value.splice(start, deleteCount, ...items);
    if (items && items.length) {
      this._itemsAdded.trigger(items);
    }
    if (result && result.length) {
      this._itemsRemoved.trigger(result);
    }
    return result;
  }
}
