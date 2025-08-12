import { DashboardObservation } from './dashboard-observation';

export class TemplateDashboard {
  public id: string;
  public name: string;
  public index: number;
  public rows: number | undefined;
  public columns: number | undefined;
  public isLive: boolean;
  public observations: DashboardObservation[];

  constructor(
    id: string,
    name: string,
    index: number,
    rows: number | undefined,
    columns: number | undefined,
    isLive: boolean,
    observations: DashboardObservation[]
  ) {
    this.id = id;
    this.name = name;
    this.index = index;
    this.rows = rows;
    this.columns = columns;
    this.isLive = isLive;
    this.observations = observations;
  }
}
