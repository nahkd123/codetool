import { MapView, recordMapView } from "./maps";

export interface TemplatingObject {
    _text?: string;
    [x: string]: string | number | TemplatingObject | undefined;
}

export type TemplateFillable = string | number | TemplatingObject | undefined;

export const TEMPLATE_VARIABLE_REGEX = /\$\{\{\s*(?<target>.+?)\s*\}\}/g;

function recursiveGet(path: string[], fillable: TemplateFillable) {
    function mapViewForString(str: string): MapView<string, TemplateFillable> {
        return recordMapView({
            "": str,
            len: str.length,
            length: str.length,
            upper: str.toUpperCase(),
            lower: str.toLowerCase(),
            trim: str.trim()
        });
    }
    function mapViewForNumber(num: number): MapView<string, TemplateFillable> {
        return recordMapView({
            "": num.toString(),
            bin: num.toString(2),
            hex: num.toString(16)
        });
    }
    function mapViewForObj(obj: TemplatingObject): MapView<string, TemplateFillable> {
        return {
            get(key) {
                if (key.trim().length == 0) return obj._text ?? "<???>";
                return obj[key];
            },
        };
    }

    let map: MapView<string, TemplateFillable> = typeof fillable == "string" ? mapViewForString(fillable)
        : typeof fillable == "number" ? mapViewForNumber(fillable)
        : typeof fillable == "object" ? mapViewForObj(fillable)
        : recordMapView({});

    while (path.length > 0) {
        if (path.length == 0) break;
        const next = path.shift();
        if (next) fillable = map.get(next) ?? "";

        map = typeof fillable == "string" ? mapViewForString(fillable)
            : typeof fillable == "number" ? mapViewForNumber(fillable)
            : typeof fillable == "object" ? mapViewForObj(fillable)
            : recordMapView({});
    }

    return map.get("");
}

export function processTemplate(input: string, map: MapView<string, TemplateFillable>) {
    return input.replaceAll(TEMPLATE_VARIABLE_REGEX, (substr, ...param) => {
        const { target } = param[3] as { target: string };
        const path = target.split(".").filter(v => v);
        const first = path.shift();
        if (!first) return "<???>";
        return (recursiveGet(path, map.get(first)) ?? "<???>") + "";
    });
}