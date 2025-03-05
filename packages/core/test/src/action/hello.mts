import {action} from "../../../src/index.mjs";

export default action<{name: string}, string>({
    run({name}) {
        return `Hello, ${name}!`;
    },
});
