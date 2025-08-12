import { QuantityUnitOption } from "../interfaces/quantity-unit.interface";

export class dataTypes {
    static readonly Binary = 'Binary';
    static readonly Boolean = 'Boolean';
    static readonly Double = 'Double';
    static readonly Integer = 'Integer';
    static readonly Position = 'Position';
    static readonly String = 'String';

    public static readonly emptyEnumQuntityOption : QuantityUnitOption = { 
        quantityId: 1000,
        quantityName: "Enumeration",
        unitId: null,
        unitsName: null
    };
}