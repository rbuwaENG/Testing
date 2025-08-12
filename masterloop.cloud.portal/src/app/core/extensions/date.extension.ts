import * as moment from 'moment';

export class DateExtension {
  constructor() {
    throw new Error('Cannot new this class');
  }

  static getTimestampAsMilliseconds(date: Date | string) {
    date = typeof date === 'object' ? date.toString() : date;
    return +moment.utc(date).format('x');
  }
}
