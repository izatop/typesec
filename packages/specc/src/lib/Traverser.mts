import ts from "typescript";
import type {Store} from "../interfaces.mjs";
import {TypeReader} from "./TypeReader.mjs";

export class Traverser {
    readonly #store = new Map<string, Store>();
    readonly #source: ts.SourceFile;

    constructor(source: ts.SourceFile) {
        this.#source = source;
    }

    public getSourceName(): string {
        return this.#source.fileName;
    }

    public getSourceFile(): ts.SourceFile {
        return this.#source;
    }

    public traverse(): Store[] {
        this.#source.forEachChild((node) => this.#visit(node));

        return [...this.#store.values()];
    }

    #visit(node: ts.Node): void {
        if (ts.isTypeAliasDeclaration(node)) {
            const reader = TypeReader.from(this, node);
            if (reader) {
                for (const store of reader.read()) {
                    this.#store.set(store.name, store);
                }
            }
        }
    }
}
