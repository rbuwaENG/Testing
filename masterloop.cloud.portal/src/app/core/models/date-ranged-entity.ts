import * as moment from 'moment';

// export class DateRangedEntity {
//     public _from: string;
//     public _to: string;
//     public get from(): moment.Moment { return !this._from ? null : moment.utc(this._from.toString()); }
//     public set from(value: moment.Moment) { this._from = !value ? null : value.format(); }
//     public get to(): moment.Moment { return !this._to ? null : moment.utc(this._to.toString()); }
//     public set to(value: moment.Moment) { this._to = !value ? null : value.format(); }
//   }

  export class DateRangedEntity {
    public _from: string;
    public _to: string;
    public get from(): moment.Moment { 
      return !this._from ? null : moment(this._from); 
    }
    public set from(value: moment.Moment) { 
      this._from = !value ? null : value.format(); 
    }
    public get to(): moment.Moment { 
      return !this._to ? null : moment(this._to); 
    }
    public set to(value: moment.Moment) { 
      this._to = !value ? null : value.format(); 
    }
  }