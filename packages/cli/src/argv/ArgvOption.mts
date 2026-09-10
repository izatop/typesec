import {assert} from "@typesec/the/assert";
import {is} from "@typesec/the/fn";
import type {OptionPattern} from "./interfaces.mjs";

/**
 * One command-line option, with its aliases and whether a value is required.
 * @category cli
 */
export class ArgvOption<T extends string, R extends boolean> {
    readonly #pattern: string;
    readonly #patterns: string[];

    readonly #required: boolean;

    /** The value name taken from the pattern, which is also the key in the parse result. */
    public readonly name: T;

    private constructor(pattern: OptionPattern<T>, required: R) {
        this.#pattern = pattern;
        this.#patterns = pattern.replace(/\s*<([^>]+)>$/, "").split(/[,\s]/);
        this.name = pattern.match(/<([^>]+)>/)?.[1] as T;
        this.#required = required;
    }

    /** Whether parsing fails when the option is absent. */
    public get required(): boolean {
        return this.#required;
    }

    /**
     * Builds an option from its pattern.
     * @example ArgvOption.from("-f, --foo <foo>", true)
     */
    public static from<T extends string>(pattern: OptionPattern<T>): ArgvOption<T, false>;
    public static from<T extends string>(pattern: OptionPattern<T>, required: false): ArgvOption<T, false>;
    public static from<T extends string, R extends boolean>(pattern: OptionPattern<T>, required: R): ArgvOption<T, R>;
    public static from<T extends string>(pattern: OptionPattern<T>, required = false): ArgvOption<T, boolean> {
        return new ArgvOption<T, boolean>(pattern, required);
    }

    /** Throws when a required option carries no value. */
    public validate(value?: string): void {
        assert(is(value, "string") || !this.#required, `The option ${this.#pattern} is required`);
    }

    /** Whether an argument is one of this option's flags. */
    public match(value?: string) {
        return value ? this.#patterns.includes(value) : false;
    }
}
