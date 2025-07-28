import {test} from "bun:test";
import {runtime} from "./runtime.mts";

test("heartbeat", async () => {
    runtime.trap();
});
