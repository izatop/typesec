type Line = {mark: " " | "-" | "+"; text: string};

/**
 * Line diff of two texts in unified form, with `---`/`+++` headers and three lines of context.
 *
 * Meant for configuration files a person reviews before replacing one; the longest-common-
 * subsequence table is quadratic, which is fine at that size.
 * @category tooling
 */
export function unifiedDiff(before: string, after: string, labels: [string, string]): string {
    const lines = compare(before.split("\n"), after.split("\n"));
    const changed = lines.flatMap((line, index) => (line.mark === " " ? [] : [index]));
    if (changed.length === 0) return "";

    const output = [`--- ${labels[0]}`, `+++ ${labels[1]}`];
    let shown = -1;

    for (const index of changed) {
        const from = Math.max(index - 3, shown + 1);
        const to = Math.min(index + 3, lines.length - 1);
        if (from > shown + 1 && shown >= 0) output.push("...");

        for (let at = from; at <= to; at++) {
            const line = lines[at]!;
            output.push(`${line.mark} ${line.text}`);
        }

        shown = Math.max(shown, to);
    }

    return output.join("\n");
}

function compare(before: string[], after: string[]): Line[] {
    const common: number[][] = Array.from({length: before.length + 1}, () => Array(after.length + 1).fill(0));

    for (let i = before.length - 1; i >= 0; i--) {
        for (let j = after.length - 1; j >= 0; j--) {
            common[i]![j] =
                before[i] === after[j] ? common[i + 1]![j + 1]! + 1 : Math.max(common[i + 1]![j]!, common[i]![j + 1]!);
        }
    }

    const lines: Line[] = [];
    let i = 0;
    let j = 0;

    while (i < before.length || j < after.length) {
        if (i < before.length && j < after.length && before[i] === after[j]) {
            lines.push({mark: " ", text: before[i++]!});
            j++;
        } else if (i < before.length && (j === after.length || common[i + 1]![j]! >= common[i]![j + 1]!)) {
            lines.push({mark: "-", text: before[i++]!});
        } else {
            lines.push({mark: "+", text: after[j++]!});
        }
    }

    return lines;
}
