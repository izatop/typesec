import {constants} from "node:fs";
import {copyFile, lstat, mkdir, unlink} from "node:fs/promises";
import path from "node:path";

import migrations from "./migrations.json";

const normalize = (line: string) => line.trim().replace(/[\t ]+/g, " ");

/** Removes known obsolete lines, preserving unrelated bytes and backing up every changed file. */
export async function migrateFiles(target: string, backup: string, log: (line: string) => void): Promise<boolean> {
    let changed = false;

    for (const migration of migrations) {
        const filename = path.join(target, migration.file);
        const stat = await lstat(filename).catch((error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") return undefined;

            throw error;
        });

        if (!stat?.isFile()) continue;

        const current = await Bun.file(filename).text();
        const removed = new Set(migration.removeLines.map(normalize));
        const lines = current.match(/[^\n]*\n|[^\n]+$/g) ?? [];
        const remaining = lines.filter((line) => !removed.has(normalize(line)));

        if (remaining.length === lines.length) continue;

        const hasInstructions = remaining.some((line) => {
            const trimmed = line.trim();

            return trimmed !== "" && !trimmed.startsWith(migration.commentPrefix);
        });

        const saved = path.join(backup, migration.file);

        await mkdir(path.dirname(saved), {recursive: true});
        await copyFile(filename, saved, constants.COPYFILE_EXCL);

        if (hasInstructions) {
            await Bun.write(filename, remaining.join(""));
        } else {
            await unlink(filename);
        }

        changed = true;
        log(
            `${migration.file}: ${hasInstructions ? "migrated" : "removed"}, previous version in ${path.relative(target, saved)}`,
        );
    }

    return changed;
}
