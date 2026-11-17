import {mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

/** How the fixture process runs: plain `bun`, `bun --hot`, `bun --watch`, or `bun test` on the entry. */
export type FixtureMode = "plain" | "hot" | "watch" | "test";

/** How the fixture process ended; `killed` means the deadline stopped a process that did not end by itself. */
export type FixtureOutcome = {code: number | null; signal: NodeJS.Signals | number | null; killed: boolean};

/** A real Bun process running a temporary entry, driven by the `@@` lines it prints. */
export type Fixture = AsyncDisposable & {
    /** Every `@@` line printed so far without the prefix or, given a name, the rest of each line `<name> <rest>`. */
    events(name?: string): readonly string[];
    /** Waits for the next line after the previous match that equals `event` or starts with `event `, and returns it. */
    next(event: string): Promise<string>;
    /** Waits until the process's stderr contains `text`. */
    failure(text: string): Promise<void>;
    /** Rewrites the entry, with the given source or the same one, so Bun sees a change. */
    save(source?: string): void;
    /** Sends the process a signal. */
    signal(signal: NodeJS.Signals): void;
    /** Settles once the process has ended and all its output has been read. */
    readonly exited: Promise<FixtureOutcome>;
};

const src = `${import.meta.dir}/../..`;

/**
 * The prelude of a fixture entry: the core modules it uses, by absolute path, and `emit(event)`, which prints a line
 * the parent reads. The entry is plain JavaScript, so an import it only needs for its side effect is not dropped.
 */
export const prelude = `
    import {lifecycle} from ${JSON.stringify(`${src}/runtime/controller/lifecycle.mts`)};
    import {store} from ${JSON.stringify(`${src}/runtime/controller/hmr.mts`)};
    import {main} from ${JSON.stringify(`${src}/runtime/main.mts`)};
    import {runtime} from ${JSON.stringify(`${src}/runtime/runtime.mts`)};
    import {resolve, service, unload} from ${JSON.stringify(`${src}/service/fn.mts`)};

    const emit = (event) => console.log("@@" + event);
    const generation = store.reloadCount;
`;

/**
 * Ends the child when the test runner is gone, so a killed runner leaves no watcher behind. It is created once from a
 * string, so no closure of an entry's generation outlives a reload, and it never keeps the process alive.
 */
const watchdog = (parent: number) => `
    globalThis.watchdog ??= setInterval(new Function("process.ppid === ${parent} || process.kill(process.pid, 9)"), 250);
    globalThis.watchdog.unref();
`;

const flags = {plain: [], hot: ["--hot", "--no-clear-screen"], watch: ["--watch", "--no-clear-screen"], test: ["test"]};

/**
 * Starts a real Bun process on a temporary entry. The process gets no timer that keeps it alive, so one that does not
 * end by itself is killed after 3 s, under the test runner's timeout, and reports `killed`.
 */
export function fixture(entry: string, mode: FixtureMode): Fixture {
    const dir = mkdtempSync(join(tmpdir(), "typesec-fixture-"));
    const file = join(dir, mode === "test" ? "entry.test.mjs" : "entry.mjs");
    const write = (source: string) => writeFileSync(file, watchdog(process.pid) + source);
    write(entry);

    const child = Bun.spawn({cmd: [process.execPath, ...flags[mode], file], cwd: dir, stdout: "pipe", stderr: "pipe"});
    let killed = false;
    const timer = setTimeout(() => {
        killed = true;
        child.kill(9);
    }, 3000);

    const lines: string[] = [];
    let errors = "";
    let done = false;
    const wake = new Set<() => void>();
    const notify = () => {
        for (const check of wake) check();
    };

    const read = async (stream: ReadableStream<Uint8Array>, take: (text: string) => void) => {
        const decoder = new TextDecoder();
        for await (const chunk of stream) {
            take(decoder.decode(chunk, {stream: true}));
            notify();
        }
    };

    let buffer = "";
    const exited = Promise.all([
        child.exited,
        read(child.stdout, (text) => {
            const parts = (buffer + text).split("\n");
            buffer = parts.pop() ?? "";
            lines.push(...parts.filter((line) => line.startsWith("@@")).map((line) => line.slice(2)));
        }),
        read(child.stderr, (text) => void (errors += text)),
    ])
        .then((): FixtureOutcome => ({code: child.exitCode, signal: child.signalCode, killed}))
        .finally(() => {
            clearTimeout(timer);
            done = true;
            notify();
        });

    /** Settles once `found` returns a value, or rejects with the output so far when the process has ended without it. */
    const wait = <T,>(what: string, found: () => {value: T} | undefined): Promise<T> =>
        new Promise((resolve, reject) => {
            const check = () => {
                const match = found();
                if (match) {
                    wake.delete(check);
                    resolve(match.value);
                } else if (done) {
                    wake.delete(check);
                    reject(new Error(`ended before ${what}: ${JSON.stringify(lines)}\n${errors}`));
                }
            };

            wake.add(check);
            check();
        });

    let cursor = 0;
    let saves = 0;

    return {
        exited,
        events: (name) =>
            name === undefined
                ? lines
                : lines.filter((line) => line.startsWith(`${name} `)).map((line) => line.slice(name.length + 1)),
        next: (event) =>
            wait(`@@${event}`, () => {
                const index = lines.findIndex(
                    (line, i) => i >= cursor && (line === event || line.startsWith(`${event} `)),
                );
                if (index < 0) return undefined;

                cursor = index + 1;

                return {value: lines[index]!};
            }),
        failure: (text) =>
            wait(`stderr ${JSON.stringify(text)}`, () => (errors.includes(text) ? {value: undefined} : undefined)),
        save: (source = entry) => write(`${source}\n// save ${++saves}\n`),
        signal: (signal) => void child.kill(signal),
        async [Symbol.asyncDispose]() {
            if (child.exitCode === null && child.signalCode === null) child.kill(9);

            await exited.catch(() => undefined);
            rmSync(dir, {recursive: true, force: true});
        },
    };
}
