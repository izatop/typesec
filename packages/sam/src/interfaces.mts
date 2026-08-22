export type Step<TInput, TOutput> = (input: TInput) => TOutput;

export type PipeResult<TCurrent, TNext> = TCurrent extends PromiseLike<unknown> ? Promise<Awaited<TNext>> : TNext;

export const parserStep = Symbol("sam.parserStep");
export const patternStep = Symbol("sam.patternStep");

export type ParserStep<TInput, TOutput> = Step<TInput, TOutput> & {
    readonly [parserStep]: true;
};

type Mutable<T> = {-readonly [K in keyof T]: T[K]};

export type NarrowByPattern<TInput, TPattern> = TInput extends unknown
    ? TPattern extends Partial<TInput>
        ? Exclude<keyof TPattern, keyof TInput> extends never
            ? TInput & Mutable<TPattern>
            : never
        : never
    : never;

export type CompatiblePattern<TInput, TPattern> = [NarrowByPattern<TInput, TPattern>] extends [never] ? never : unknown;

export type PatternStep<TPattern extends object> = {
    <TInput>(input: TInput & CompatiblePattern<TInput, TPattern>): NarrowByPattern<TInput, TPattern>;
    readonly [patternStep]: TPattern;
};

export type RegularStep<TInput, TOutput> = Step<TInput, TOutput> & {
    readonly [patternStep]?: never;
};

export interface Pipeline<TInput, TOutput> {
    pipe<TNext>(step: RegularStep<Awaited<TOutput>, TNext>): Pipeline<TInput, PipeResult<TOutput, TNext>>;
    pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): Pipeline<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>>;
    run(value: TInput): TOutput;
}

export interface ParsedPipeline<TInput, TOutput> extends Pipeline<TInput, TOutput> {
    pipe<TNext>(step: RegularStep<Awaited<TOutput>, TNext>): ParsedPipeline<TInput, PipeResult<TOutput, TNext>>;
    pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): ParsedPipeline<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>>;
    parse(value: unknown): TOutput;
}

export type StateChange<TState> = {
    readonly from: TState;
    readonly to: TState;
};

export type StatePattern<TState> = TState extends unknown ? Partial<TState> : never;

export type TransitionStateDefinition<TState, TKey extends string = string> = {
    readonly name: string;
    readonly description?: string;
    readonly when: StatePattern<TState>;
    readonly to: readonly TKey[];
};

export type TransitionDefinition<TState, TKey extends string = string> = Record<
    TKey,
    TransitionStateDefinition<TState, TKey>
>;

export type TransitionKey<TDefinition> = Extract<keyof TDefinition, string>;

type PatternOf<TDefinition, TKey extends keyof TDefinition> = TDefinition[TKey] extends {readonly when: infer TPattern}
    ? Mutable<TPattern>
    : never;

export type TransitionState<TState, TDefinition, TKey extends TransitionKey<TDefinition>> = NarrowByPattern<
    TState,
    PatternOf<TDefinition, TKey>
>;

export type ValidateTransitionDefinition<TState, TDefinition> = {
    [TKey in keyof TDefinition]: TDefinition[TKey] extends {readonly when: infer TPattern}
        ? [CompatiblePattern<TState, TPattern>] extends [never]
            ? never
            : TDefinition[TKey]
        : never;
};

type TransitionTargets<TDefinition, TKey extends TransitionKey<TDefinition>> = TDefinition[TKey] extends {
    readonly to: readonly (infer TTarget)[];
}
    ? Extract<TTarget, TransitionKey<TDefinition>>
    : never;

export type AllowedStateChange<TState, TDefinition> = {
    [TFrom in TransitionKey<TDefinition>]: TransitionTargets<TDefinition, TFrom> extends infer TTo
        ? TTo extends TransitionKey<TDefinition>
            ? {
                  readonly from: TransitionState<TState, TDefinition, TFrom>;
                  readonly to: TransitionState<TState, TDefinition, TTo>;
              }
            : never
        : never;
}[TransitionKey<TDefinition>];
