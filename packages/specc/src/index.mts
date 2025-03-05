import {program} from "@commander-js/extra-typings";
import compiler from "./compiler/compiler.mjs";

program
    .option("-s, --scope <dir>", "Project scope directory", process.cwd())
    .argument("<files...>", "Schema files")
    .action((files, options) => compiler(files, options.scope));

program.parse();
