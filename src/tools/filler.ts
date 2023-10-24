import { CommandBranch, CommandError } from "./cli-base";
import * as npath from "path";
import * as fs from "fs";
import * as os from "os";
import { C_STYLE_COMMENT } from "../utils/comments";
import { processTemplate } from "../utils/templating";
import { CaseType, createIdentifierObject } from "../utils/cases";

export const cliFiller: CommandBranch = {
    new: async args => {
        if (args.length == 0) throw new CommandError("Expected '<template-id> [<parameter-name>=<value>...]' but no arguments found!");
        const [templateId, ...rawParameters] = args;
        let parameters = rawParameters.map(v => v.split("=", 2)).map(v => ({ name: v[0], value: v[1] }));

        const root = findRoot(process.cwd());
        const rawConfig: RawConfig = JSON.parse(await fs.promises.readFile(npath.resolve(root, "codetool.filler.json"), "utf-8"));
        let config: Config = {
            mapping: []
        };
        (rawConfig.mapping ?? []).forEach(e => config.mapping.push({ regex: new RegExp(e.regex, e.flags), mode: e.mode }));

        console.log(`Project root is ${root}`);
        console.log(`Finding '${templateId}' template...`);

        await findFile(config, npath.resolve(process.cwd()), async entry => {
            switch (entry.type) {
                case "source": await applyInSourceTemplate(entry.path, templateId, parameters); break;
                case "template": await applyFileTemplate(entry.path, templateId, parameters); break;
                default: break;
            }
        });

        console.log("Done!");
    }
};

function findRoot(cd: string) {
    const { root } = npath.parse(cd);

    while (!fs.existsSync(npath.resolve(cd, "codetool.filler.json")) && cd != root) {
        cd = npath.resolve(cd, "..");
    }

    if (cd == root) throw new CommandError("Failed to determine project root. Try adding 'codetool.filler.json' at your project root.");
    return cd;
}

async function findFile(config: Config, cd: string, callback: (value: { path: string, type: "source" | "template" }) => any): Promise<void> {
    const stat = await fs.promises.stat(cd);

    if (stat.isDirectory()) {
        const content = await fs.promises.readdir(cd);
        await Promise.all(content.map(async child => await findFile(config, npath.resolve(cd, child), callback)));
    } else {
        const relatedEntry = config.mapping.find(v => v.regex.test(cd));
        if (relatedEntry) await callback({ path: cd, type: relatedEntry.mode == "in-source" ? "source" : "template" });
    }
}

async function applyInSourceTemplate(path: string, templateId: string, parameters: { name: string, value: string }[]) {
    const src = await fs.promises.readFile(path, "utf-8");
    let found = false;
    const processed = src.replaceAll(C_STYLE_COMMENT, (substr, ...a) => {
        const { indent, contentInline, contentBlock } = a[a.length - 1];

        if (contentBlock) {
            const lines = (contentBlock as string)
                .split("\n")
                .map(v => v.trim())
                .map(v => v.match(/^\*\s?/g) ? v.replace(/^\*\s?/g, "") : null)
                .filter(v => v) as string[];

            const head = lines[0]?.match(/@template\s+(?<id>[A-Za-z0-9-_:.]+)(\s+(?<rawRaramsSpec>.+))/);
            if (!head || !head.groups) return substr;

            const { id, rawRaramsSpec } = head.groups;
            if (id != templateId) return substr;
            const paramsSpec = rawRaramsSpec.split(" ").map(v => {
                const s = v.split(":", 2);
                if (s.length == 1) return { name: v };
                else return { name: s[0], caseType: s[1] as CaseType };
            });

            const newContent = lines.splice(1)
                .map(line => processTemplate(line, paramsMapView(parameters, paramsSpec)))
                .map(v => indent + v);

            const crlf = src.includes("\r\n");
            const endings = crlf? "\r\n" : "\n";
            found = true;
            return newContent.join(endings) + endings + (indent as string).replace(/[\r\n]/g, "") + substr.trimStart();
        }

        return substr;
    });

    if (found) {
        await fs.promises.writeFile(path, processed, "utf-8");
        console.log(`[m] ${path}`);
    }
}

function paramsMapView(parameters: { name: string; value: string; }[], paramsSpec: ({ name: string; caseType?: undefined; } | { name: string; caseType: "pascal" | "snake" | "kebab" | "camel" | "constant"; })[]): import("c:/Users/nahkd/Documents/webdev/codetool/src/utils/maps").MapView<string, import("c:/Users/nahkd/Documents/webdev/codetool/src/utils/templating").TemplateFillable> {
    return {
        get(key) {
            const p = parameters.find(v => v.name == key);
            if (!p) return key;

            const spec = paramsSpec.find(v => v.name == key);
            if (!spec?.caseType) return p.value;
            else return createIdentifierObject(p.value, spec.caseType);
        },
    };
}

async function applyFileTemplate(path: string, templateId: string, parameters: { name: string, value: string }[]) {
    const crlf = os.platform() == "win32";
    const endings = crlf ? "\r\n" : "\n";
    const lines = (await fs.promises.readFile(path, "utf-8"))
        .split("\n")
        .map(v => v.endsWith("\r") ? v.substring(0, v.length - 1) : v);

    const head = lines[0]?.match(/@template\s+(?<id>[A-Za-z0-9-_:.]+)(\s+(?<rawRaramsSpec>.+))/);
    if (!head || !head.groups) return;

    const { id, rawRaramsSpec } = head.groups;
    if (id != templateId) return;

    const paramsSpec = rawRaramsSpec.split(" ").map(v => {
        const s = v.split(":", 2);
        if (s.length == 1) return { name: v };
        else return { name: s[0], caseType: s[1] as CaseType };
    });

    let filename = npath.parse(path).name + ".txt";

    lines.shift();
    while (lines[0].trim() != "@endheader") {
        const line = processTemplate(lines.shift()!, paramsMapView(parameters, paramsSpec));
        if (line.startsWith("@use filename ")) filename = line.substring("@use filename ".length).trim();
    }
    lines.shift();
    while (lines[0].trim() == "") lines.shift();

    const processed = lines
        .map(v => processTemplate(v, paramsMapView(parameters, paramsSpec)))
        .join(endings);
    await fs.promises.writeFile(npath.resolve(path, "..", filename), processed, "utf-8");
    console.log(`[c] ${path} => ${npath.resolve(path, "..", filename)}`);
}

interface RawConfig {
    mapping?: RawMappingEntry[];
}

interface RawMappingEntry {
    regex: string;
    flags?: string;
    mode: "in-source" | "file-template";
}

interface Config {
    mapping: MappingEntry[];
}

interface MappingEntry {
    regex: RegExp;
    mode: RawMappingEntry["mode"];
}