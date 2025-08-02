import {describe, expect, mock, test} from "bun:test";
import {scheduler} from "timers/promises";
import {exit, setShutdownFunction} from "./exit.mts";

describe("exit(code, reason)", () => {
    test("should exit", async () => {
        const pe = mock((_code, _reason) => void 0);
        setShutdownFunction(pe);
        exit(0);

        await scheduler.wait(0);
        expect(pe.mock.calls).toEqual([[0, null]]);
    });

    test("should exit code > 0", async () => {
        const pe = mock((_code, _reason) => void 0);
        setShutdownFunction(pe);
        exit(1, "Test reason");

        await scheduler.wait(0);
        expect(pe.mock.calls).toEqual([[1, "Test reason"]]);
    });

    test("should cancel exit", async () => {
        const pe = mock((_code, _reason) => void 0);
        setShutdownFunction(pe);
        clearImmediate(exit(2)); // test exit cancelled

        await scheduler.wait(0);
        expect(pe.mock.calls).toEqual([]);
    });
});
