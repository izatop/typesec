import {program} from "@commander-js/extra-typings";
import {runApplication} from "@typesec/unit";

program.argument("<location>", "Unit path").action(async (location) => {
    runApplication(location);
});

program.parse();
