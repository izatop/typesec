import assert from "node:assert";
import type {OptionPattern} from "./interfaces.mjs";

export class ArgvOption<T, R extends boolean> {
    readonly #pattern: string[];

    readonly #required: boolean;

    public readonly name: T;

    constructor(pattern: string, required: R) {
        this.#pattern = pattern.replace(/\s*<([^>]+)>$/, "").split(/[,\s]/);
        this.name = pattern.match(/<([^>]+)>/)?.[1] as T;
        this.#required = required;
    }

    public get required(): boolean {
        return this.#required;
    }

    public static from<T extends string>(pattern: OptionPattern<T>): ArgvOption<T, false>;
    public static from<T extends string>(pattern: OptionPattern<T>, required: false): ArgvOption<T, false>;
    public static from<T extends string, R extends boolean>(pattern: OptionPattern<T>, required: R): ArgvOption<T, R>;
    public static from<T extends string>(pattern: OptionPattern<T>, required = false): ArgvOption<T, boolean> {
        return new ArgvOption<T, boolean>(pattern, required);
    }

    public validate(value: string | undefined): string | undefined {
        assert(value || !this.#required, `Options ${this.name} is required`);

        return value;
    }

    public match(value?: string) {
        return value ? this.#pattern.includes(value) : false;
    }
}
