import { NotifyableObject } from './notifyable-object';
import { isUndefined } from 'util';

/**
 * Provides feature to read/write object values from/to localstorage....
 */
export class CachableNotifyingObject<T> extends NotifyableObject<T> {
  /**
   * key by which the object will be cached to/from localStorage...
   */
  protected cacheKey: string;

  constructor(cacheKey: string) {
    super();
    this.cacheKey = cacheKey;
  }

  /**
   * Reads and parses object from the store. If not found NULL is returned.
   */
  public getValue(): T {
    this.value = !isUndefined(this.value)
      ? this.value
      : JSON.parse(localStorage.getItem(this.cacheKey) || 'null');
    return super.getValue();
  }

  /**
   * Caches new object value into localstorage...
   * @param value new value.
   */
  public setValue(value: T): void {
    super.setValue(value);
    localStorage.setItem(this.cacheKey, JSON.stringify(this.value));
  }

  /**
   * Clear cache value by key
   */
  public clear() {
    localStorage.removeItem(this.cacheKey);
  }
}
