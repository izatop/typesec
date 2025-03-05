import assert from "assert";
import {action} from "../../../src/index.mjs";

type State = {
    name: string;
};

export default action<State, string>({
    name: "Test action",
    run(p) {
        assert(p.name === "Action", "Action name should be 'Action'");

        return `Test, ${p.name}!`;
    },
});
