export class ImportData {
  Id: string;
  Name: string;
  Description: string;
  Revision: string;
  Protocol: string;
  Observations: Observation[];
  Commands: Command[];
  Settings: Setting[];
  Pulses: Pulse[];
}

interface Observation {
  Id: number;
  Name: string;
  Description: string;
  DataType: number;
  Historian: number;
}
interface Command {
  Id: number;
  Name: string;
  Description: string;
  Arguments: Argument[];
}
interface Setting {
  Id: number;
  Name: string;
  DataType: number;
  IsRequired: boolean;
  DefaultValue: string;
  LastUpdatedOn: string;
}
interface Pulse {
  Id: number;
  Name: string;
  Description: string;
  MaximumAbsence: number;
}
interface Argument {
  Id: number;
  Name: string;
  DataType: number;
}
