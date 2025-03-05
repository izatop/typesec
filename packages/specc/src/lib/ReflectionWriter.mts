import type {Nullable} from "@typesec/the";
import {log} from "@typesec/tracer";
import {writeFile} from "fs/promises";
import {parse, relative, resolve} from "path";
import {isString} from "radash";
import type {Store} from "../interfaces.mjs";

export class ReflectionWriter {
    readonly #scope: string;
    readonly #stores: Store[];

    constructor(scope: string, stores: Store[]) {
        this.#scope = scope;
        this.#stores = stores;
    }

    public async write(from: string) {
        const file = parse(from);
        const path = relative(this.#scope, from);
        const declarations: Nullable<string>[] = [
            this.#getTypeListCode(),
            ...this.#stores.map((store) => this.#getReflectionDefinitionCode(store)),
        ];

        const code = [this.#getImportListCode(path.replace(".mts", ".mjs")), ...declarations].join("\n\n");

        log("write(%s)", path);
        await writeFile(resolve(file.dir, `${file.name}.ref.mts`), code, "utf-8");
    }

    #getReflectionDefinitionCode(store: Store): string | null {
        const payload = JSON.stringify(store.members, null, 4);

        return `export const ${store.name}Ref = new Reflection<${store.name}>("${store.name}", ${payload});`;
    }

    #getTypeListCode(): string {
        const lines = [];
        for (const store of this.#stores) {
            if (store.sourceCode) {
                lines.push(`export type ${store.name} = ${store.sourceCode};`);
            }
        }

        return lines.join("\n\n");
    }

    #getImportListCode(from: string): string {
        const members = this.#stores.filter((store) => isString(store.sourceFile)).map((store) => store.name);

        const imports = [
            `import {Reflection} from "@typesec/specd";`,
            `import type {ID, Spec, SpecOf, Input} from "@typesec/spec";`,
            `import type {${members.join(", ")}} from "./${from}";`,
        ];

        return imports.join("\n");
    }
}
