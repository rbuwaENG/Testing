import { DashboardWidget } from '../../enums/dashboard-widget.enum';

export class DashboardObservation {
  public id: number;
  public timespan: DashboardTimespan;
  public widget: DashboardWidget;
  public placement: DashboardPlacement;

  constructor(
    id: number,
    timespan: DashboardTimespan,
    widget: DashboardWidget,
    placement: DashboardPlacement
  ) {
    this.id = id;
    this.timespan = timespan;
    this.widget = widget;
    this.placement = placement;
  }
}

export class DashboardTimespan {
  public duration: number;
  public resolution: number;

  constructor(duration: number, resolution: number) {
    this.duration = duration;
    this.resolution = resolution;
  }
}

export class DashboardPlacement {
  public column: number;
  public row: number;
  public columnSpan: number;
  public rowSpan: number;

  constructor(
    column: number,
    row: number,
    columnSpan: number,
    rowSpan: number
  ) {
    this.column = column;
    this.row = row;
    this.columnSpan = columnSpan;
    this.rowSpan = rowSpan;
  }
}
