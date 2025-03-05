import {action} from "../../../src/index.mjs";

export default action<{values: number[]}, number>({
    run: ({values}) => values.reduce((l, r) => l + r, 0) / values.length,
});
