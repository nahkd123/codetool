import { TemplatingObject } from "./templating";

export interface CaseSerializer {
    serialize(segments: string[]): string;
    deserialize(str: string): string[];
}

export const Cases = {
    pascal: <CaseSerializer> {
        serialize: s => s.map(v => v[0].toUpperCase() + v.substring(1).toLowerCase()).join(""),
        deserialize: s => s.split(/(?=[A-Z])/g).map(v => v.toLowerCase())
    },
    snake: <CaseSerializer> {
        serialize: s => s.map(v => v.toLowerCase()).join("_"),
        deserialize: s => s.split(/_/g).map(v => v.toLowerCase())
    },
    kebab: <CaseSerializer> {
        serialize: s => s.map(v => v.toLowerCase()).join("-"),
        deserialize: s => s.split(/-/g).map(v => v.toLowerCase())
    },
    camel: <CaseSerializer> {
        serialize: s => {
            let out = s.map(v => v[0].toUpperCase() + v.substring(1).toLowerCase()).join("");
            return out[0].toLowerCase() + out.substring(1);
        },
        deserialize: s => s.split(/(?=[A-Z])/g).map(v => v.toLowerCase())
    },
    constant: <CaseSerializer> {
        serialize: s => s.map(v => v.toUpperCase()).join("_"),
        deserialize: s => s.split(/_/g).map(v => v.toLowerCase())
    },
};

export type CaseType = keyof typeof Cases;

export type IdentifierObject = TemplatingObject & {
    _text: string;
    _case: CaseType;
} & {
    [x in CaseType]: string;
}

export function createIdentifierObject(text: string, inputCase: CaseType) {
    let obj = <IdentifierObject> {
        _text: text,
        _case: inputCase
    };
    let input = Cases[inputCase].deserialize(text);

    for (let type in Cases) {
        obj[type as CaseType] = Cases[type as CaseType].serialize(input);
    }

    return obj;
}