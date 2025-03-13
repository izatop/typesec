import {program} from "@commander-js/extra-typings";
import {getApplication} from "@typesec/unit";
import {resolveSync} from "bun";
import path from "node:path";

program.argument("<location>", "Unit path").action(async (location) => {
    const realPath = resolveSync("./" + location, process.cwd());
    const app = getApplication(await import(realPath));
    await app.proto.run({path: path.resolve(path.dirname(realPath), "app")});
});

program.parse();
