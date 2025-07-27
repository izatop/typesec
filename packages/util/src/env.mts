import type {Rec, StringKeyOf} from "@typesec/the";
import assert from "node:assert";
import {isString} from "radash";

export class Env<T extends Rec<string, string>> {
    private constructor() {}

    public ensure<K extends StringKeyOf<T>>(key: K): string {
        assert(Object.hasOwn(process.env, key), `Unknown env ${key}`);
        const value = process.env[key];
        assert(isString(value) && value.length > 0, `Wrong env ${key}="${value}"`);

        return value;
    }

    public getMaybe<K extends StringKeyOf<T>>(key: K): string | undefined;
    public getMaybe<K extends StringKeyOf<T>>(key: K, defaultValue: string): string;
    public getMaybe<K extends StringKeyOf<T>>(key: K, defaultValue?: string): string | undefined {
        return process.env[key] ?? defaultValue;
    }

    public static from<T extends Rec<string, string>>() {
        return new Env<T>();
    }
}
