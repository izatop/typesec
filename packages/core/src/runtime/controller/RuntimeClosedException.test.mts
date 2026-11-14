import {describe, expect, test} from "bun:test";
import {RuntimeClosedException, RuntimeController} from "./index.mjs";

describe("RuntimeClosedException", () => {
    test("should keep the controller reachable but out of the printed properties", () => {
        const controller = RuntimeController.clone("closed");

        const exception = new RuntimeClosedException(controller);

        expect(exception.controller).toBe(controller);
        expect(Object.keys(exception)).not.toContain("controller");
    });
});
