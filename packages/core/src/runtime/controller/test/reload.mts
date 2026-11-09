import assert from "node:assert/strict";
import {ExitSignals} from "../../../const.mts";
import {lifecycle} from "../../controller/index.mjs";

const key = Symbol.for("@typesec/test/previous-lifecycle");
type Snapshot = {
    controller: typeof lifecycle;
    reloadCount: number;
    listeners: number[];
};

const globals = globalThis as typeof globalThis & {[key]?: Snapshot};

export function checkReload(): void {
    const previous = globals[key];
    const current: Snapshot = {
        controller: lifecycle,
        reloadCount: globalThis.ReloadController.reloadCount,
        listeners: ExitSignals.map((signal) => process.listenerCount(signal)),
    };

    assert.equal(current.controller.signal.aborted, false, "Current lifecycle must be running");
    assert.equal(current.reloadCount, previous ? previous.reloadCount + 1 : 0);
    for (const signal of ExitSignals) {
        assert.equal(process.listeners(signal).filter((fn) => fn === lifecycle.abort).length, 1);
    }

    if (previous) {
        assert.notStrictEqual(current.controller, previous.controller, "Reload must create a fresh lifecycle");
        assert.equal(previous.controller.signal.aborted, true, "Previous lifecycle must be aborted");
        assert.deepEqual(current.listeners, previous.listeners, "Signal handlers must not accumulate");
    }

    globals[key] = current;
}

if (import.meta.main) {
    checkReload();
    console.info("ReloadController: generation %d", globalThis.ReloadController.reloadCount);
}
