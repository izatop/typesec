import {watch} from "@typesec/core";
import {log} from "@typesec/tracer";
import {resolve} from "node:path";
import ts from "typescript";
import {ReflectionWriter} from "../lib/ReflectionWriter.mjs";
import {Traverser} from "../lib/Traverser.mjs";

export default async function gen(files: string[], scope: string): Promise<void> {
    await watch(async () => {
        const options: ts.CompilerOptions = {noEmit: true, noCheck: true};
        const program = ts.createProgram(
            files.map((file) => resolve(scope, file)),
            options,
        );

        for (const node of program.getSourceFiles()) {
            if (!node.isDeclarationFile) {
                log("process %s", node.fileName);
                const traverser = new Traverser(node);
                const stores = traverser.traverse();
                if (stores.length > 0) {
                    const writer = new ReflectionWriter(scope, stores);
                    await writer.write(node.fileName);
                }
            }
        }
    });
}
