import {program} from "@commander-js/extra-typings";
import {apiCommand} from "./api/command.mjs";
import {bootstrapCommand} from "./bootstrap/command.mjs";

await program
    .name("typesec")
    .description("TypeSec tooling")
    .addCommand(apiCommand("api"))
    .addCommand(bootstrapCommand())
    .parseAsync();
