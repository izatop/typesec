import assert from "node:assert";
import test, {describe} from "node:test";
import MySpec, {TEST_VERSION} from "./main.spec.mjs";

// type T1 = Expect<Equal<A, B>>;

describe("SchemaRef", () => {
    test.skip("resolve(query)", async () => {
        const res = await MySpec.resolve({version: true});
        console.log("res", res);
        assert.strictEqual(res.version, TEST_VERSION);
    });
});
