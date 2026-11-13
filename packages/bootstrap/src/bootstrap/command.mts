import {Command} from "@commander-js/extra-typings";
import {createInterface, type Interface} from "node:readline/promises";
import {sync, type ScriptChoice, type SyncPrompt} from "./sync.mjs";

const write = (value: string): void => void process.stdout.write(`${value}\n`);

/** Asks on the terminal; without one there is nobody to ask, and `sync` keeps what differs. */
function terminalPrompt(terminal: Interface): SyncPrompt {
    return {
        async replaceFile(file, diff) {
            write(`\n${diff}\n`);
            const answer = await terminal.question(`Replace ${file} with the template? [y/N] `);

            return answer.trim().toLowerCase() === "y";
        },
        async replaceScript(name, current, proposed) {
            write(`\nscripts.${name}\n  project: ${current}\n  typesec: ${proposed}`);
            const answer = await terminal.question("[k]eep, [r]eplace, replace [a]ll remaining? [K/r/a] ");
            const choices: Record<string, ScriptChoice> = {r: "replace", a: "all"};

            return choices[answer.trim().toLowerCase()] ?? "keep";
        },
        async removeScript(name, current, replacement) {
            write(`\nscripts.${name}: ${current}\n  TypeSec replaced it with scripts.${replacement}`);
            const answer = await terminal.question(`Remove scripts.${name}? [y/N] `);

            return answer.trim().toLowerCase() === "y";
        },
        async removeDependency(name, replacement) {
            write(`\ndevDependencies.${name}\n  TypeSec replaced it with ${replacement}`);
            const answer = await terminal.question(`Remove ${name} and its catalog entries? [y/N] `);

            return answer.trim().toLowerCase() === "y";
        },
    };
}

async function install(target: string): Promise<void> {
    const proc = Bun.spawn(["bun", "install"], {cwd: target, stdout: "inherit", stderr: "inherit"});
    if ((await proc.exited) !== 0) throw new Error("bun install failed");
}

/**
 * `bootstrap sync`: scaffolds and updates the TypeSec configuration of a project.
 */
export function bootstrapCommand(): Command {
    const cli = new Command("bootstrap").description("Set up a project that consumes TypeSec");

    cli.command("sync")
        .description("Add TypeSec's configuration files, catalog, dependencies and scripts to the project")
        .option("-t, --target <path>", "Project root; the working directory when omitted")
        .option("--no-install", "Skip bun install after updating package.json")
        .action(async (options) => {
            const terminal = process.stdin.isTTY
                ? createInterface({input: process.stdin, output: process.stdout})
                : undefined;

            try {
                await sync({
                    target: options.target ?? process.cwd(),
                    prompt: terminal && terminalPrompt(terminal),
                    install: options.install ? install : undefined,
                    log: write,
                });
            } catch (reason) {
                process.exitCode = 1;
                write(reason instanceof Error ? reason.message : `${reason}`);
            } finally {
                terminal?.close();
            }
        });

    return cli;
}
