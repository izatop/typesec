import type {KeyOf, Rec} from "@typesec/the/type";
import z from "zod";
import type {Domain} from "../../interfaces.mjs";
import type {Contract} from "../Contract.mjs";

/**
 * The pending result of a query against a domain.
 * @category rpc
 */
export type PendingQuery<TDomain extends Domain<any, any>, Q extends PendingQueryRef<Domain.Infer<TDomain>>> = Promise<
    ClientResult<Domain.Infer<TDomain>, Q>
>;

/**
 * A query shape whose procedure inputs are optional.
 * @category rpc
 */
export type PendingQueryRef<T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]?: T[K] extends Contract<infer TIn, any>
        ? [z.output<TIn>?]
        : T[K] extends Rec
          ? PendingQueryRef<T[K]>
          : never;
};

/**
 * Narrows a contract tree to the branches a pending query selects.
 * @category rpc
 */
export type PendingQueryFilter<T extends Rec<string, unknown>, P extends PendingQueryRef<T>> = {
    [K in Extract<keyof T, keyof P>]: T[K] extends Contract<infer TIn, any>
        ? [z.output<TIn>]
        : T[K] extends Rec
          ? P[K] extends Rec
              ? PendingQueryFilter<T[K], P[K]>
              : never
          : never;
};

/**
 * What a caller may ask for: any subtree of the domain.
 *
 * Each selected procedure carries its input as a one-element tuple, which is what separates a selection from a nested branch.
 * @category rpc
 */
export type ClientQuery<T extends Rec<string, unknown>> = {
    [K in KeyOf<T, string>]?: T[K] extends Contract<infer TIn, any>
        ? [z.output<TIn>]
        : T[K] extends Rec
          ? ClientQuery<T[K]>
          : never;
};

/**
 * The result of a query, shaped like the query and typed by each contract's output.
 * @category rpc
 */
export type ClientResult<T extends Rec<string, unknown>, Q extends Rec<string, unknown>> = {
    [K in Extract<keyof T, keyof Q>]: T[K] extends Contract<any, infer TOut>
        ? z.output<TOut>
        : T[K] extends Rec
          ? Q[K] extends Rec
              ? ClientResult<T[K], Q[K]>
              : never
          : never;
};
