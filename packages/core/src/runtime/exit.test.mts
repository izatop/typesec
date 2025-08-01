import {describe, expect, mock, test} from "bun:test";
import {scheduler} from "timers/promises";
import {exit, setShutdownFunction} from "./exit.mts";

describe("exit(code, reason)", () => {
    test("should exit", async () => {
        const pe = mock((_) => void 0);
        setShutdownFunction(pe);
        exit(0);

        await scheduler.wait(0);
        expect(pe.mock.calls).toEqual([[0]]);
    });

    test("should exit code > 0", async () => {
        const pe = mock((_) => void 0);
        setShutdownFunction(pe);
        exit(1);

        await scheduler.wait(0);
        expect(pe.mock.calls).toEqual([[1]]);
    });

    test("should exit", async () => {
        const pe = mock((_) => void 0);
        setShutdownFunction(pe);
        clearImmediate(exit(2)); // test exit cancelled

        await scheduler.wait(0);
        expect(pe.mock.calls).toEqual([]);
    });
});
