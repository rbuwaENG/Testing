export class DataConvertion {

    convertDataTypes(dataType) {
        switch (dataType) {
            case 1: {
                return "Binary";
            }
            case 2: {
                return "Boolean";
            }
            case 3: {
                return "Double";
            }
            case 4: {
                return "Integer";
            }
            case 5: {
                return "Position";
            }
            case 6: {
                return "String";
            }
            case 7: {
                return "Statistics";
            }
        }
    }

}