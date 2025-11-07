import {program} from "@commander-js/extra-typings";
import {main} from "@typesec/core";
import {fn} from "@typesec/the/fn";
import {runApplication} from "@typesec/unit";

const argv = process.argv.slice(0, 3);
process.argv.splice(1, 1);

program
    .argument("<location>", "Unit path")
    .action(async (location) => {
        main(fn.arrow("cli", () => runApplication(location)));
    })
    .parse(argv);
