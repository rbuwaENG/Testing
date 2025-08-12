import { DataType } from '../models/dataType';

export var dataTypesConstant: any = {
  1: 'Binary',
  2: 'Boolean',
  3: 'Double',
  4: 'Integer',
  5: 'Position',
  6: 'String',
  7: 'Statistics',
};

export var dataTypesConst: DataType[] = [
  new DataType(1, 'Binary'),
  new DataType(2, 'Boolean'),
  new DataType(3, 'Double'),
  new DataType(4, 'Integer'),
  new DataType(5, 'Position'),
  new DataType(6, 'String'),
  new DataType(7, 'Statistics'),
];
