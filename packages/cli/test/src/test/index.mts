import {context} from "@typesec/unit";
import {CommandLineInterfaceProto} from "../../../src/index.mjs";

export const testContext = {version: 1, count: 0};

export const command = context({
    name: "Test",
    description: "Test command line",
    context: testContext,
    proto: CommandLineInterfaceProto,
});

export default command;
