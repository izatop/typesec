import {afterEach, beforeEach, describe, expect, spyOn, test} from "bun:test";
import {scheduler} from "timers/promises";

import {exit} from "../../exit.mjs";

describe("exit(code, reason)", () => {
    beforeEach(() => spyOn(process, "exit"));
    afterEach(() => spyOn(process, "exit").mockRestore());

    test("should exit", async () => {
        const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);

        exit(0);
        await scheduler.wait(0);

        expect(exitSpy).toHaveBeenCalledWith(0);
    });

    test("should exit code > 0", async () => {
        const exitSpy = spyOn(process, "exit").mockImplementation(() => undefined as never);
        exit(1, "Test reason");
        await scheduler.wait(0);
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("should cancel exit", async () => {
        const spy2 = spyOn(process, "exit");
        clearImmediate(exit(2)); // test exit cancelled

        await scheduler.wait(0);
        expect(spy2).toBeCalledTimes(0);
        spy2.mockRestore();
    });
});
