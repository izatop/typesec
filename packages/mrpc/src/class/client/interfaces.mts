import {type KeyOf, type Rec} from "@typesec/the";
import z from "zod";
import type {Domain} from "../../interfaces.mts";
import type {Contract} from "../Contract.mts";

export type PendingQuery<TDomain extends Domain<any, any>, Q extends PendingQueryRef<Domain.Infer<TDomain>>> = Promise<
    ClientResult<Domain.Infer<TDomain>, Q>
>;

export type PendingQueryRef<T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]?: T[K] extends Contract<infer TIn, any>
        ? [z.output<TIn>?]
        : T[K] extends Rec
          ? PendingQueryRef<T[K]>
          : never;
};

export type PendingQueryFilter<T extends Rec<string, unknown>, P extends PendingQueryRef<T>> = {
    [K in Extract<keyof T, keyof P>]: T[K] extends Contract<infer TIn, any>
        ? [z.output<TIn>]
        : T[K] extends Rec
          ? P[K] extends Rec
              ? PendingQueryFilter<T[K], P[K]>
              : never
          : never;
};

export type ClientQuery<T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]?: T[K] extends Contract<infer TIn, any>
        ? [z.output<TIn>]
        : T[K] extends Rec
          ? ClientQuery<T[K]>
          : never;
};

export type ClientResult<T extends Rec<string, unknown>, Q extends Rec<string, unknown>> = {
    [K in Extract<keyof T, keyof Q>]: T[K] extends Contract<any, infer TOut>
        ? z.output<TOut>
        : T[K] extends Rec
          ? Q[K] extends Rec
              ? ClientResult<T[K], Q[K]>
              : never
          : never;
};
