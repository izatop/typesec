import test from "node:test";
import * as assert from "node:assert/strict";
import run from "../../src/index.mjs";

test("serve", async () => {
    assert.equal(await run(), void 0, "Run");
});
