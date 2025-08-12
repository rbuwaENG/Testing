import { AddOnFeature } from '../enums/add-on-feature.enum';

export class Tenant {
  id: number;
  name: string;
  features: AddOnFeature[];
  templateIds: string[];

  constructor(
    id: number,
    name: string,
    features: AddOnFeature[],
    templateIds: string[]
  ) {
    this.id = id;
    this.name = name;
    this.features = features;
    this.templateIds = templateIds;
  }
}
