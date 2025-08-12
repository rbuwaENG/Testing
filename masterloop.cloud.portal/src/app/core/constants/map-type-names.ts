import { MapType } from '../enums'

var temp = {};
temp[MapType.Standard] = 'Map (Color)';
temp[MapType.Grayscale] = 'Map (Gray)';
temp[MapType.Dark] = 'Map (Dark)';
temp[MapType.Satellite] = 'Satellite';
temp[MapType.SatelliteWithLabels] = 'Satellite (with Names)';

/**
 * Display names for map types ...
 */
export const MAP_TYPE_NAMES: any = Object.assign({}, temp);
