import { Language } from "./language";

export class Python implements Language {
    getName(): string {
        return "Python";
    }
}