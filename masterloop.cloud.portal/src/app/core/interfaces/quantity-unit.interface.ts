export interface QuantityUnitOption {
    quantityId: number;
    quantityName: string;
    unitId: number;
    unitsName: string;
}

export interface UnitItem {
    Id: number;
    Name: string;
    Abbreviation: string;
}

export interface QuantityItem {
    Id: number;
    Name: string;
    Units: UnitItem[];
}