import {program} from "@commander-js/extra-typings";

import {apiCommand} from "./api/command.mjs";
import {bootstrapCommand, syncCommand} from "./bootstrap/command.mjs";

await program
    .name("typesec")
    .description("TypeSec tooling")
    .addCommand(apiCommand("api"))
    .addCommand(syncCommand())
    .addCommand(bootstrapCommand())
    .parseAsync();
