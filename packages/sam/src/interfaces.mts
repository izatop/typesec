/**
 * One pipeline stage: a plain function from input to output.
 * @category pipeline
 */
export type Step<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * Keeps a pipeline synchronous until a stage returns a thenable, then promises everything after it.
 * @category pipeline
 */
export type PipeResult<TCurrent, TNext> = TCurrent extends PromiseLike<unknown> ? Promise<Awaited<TNext>> : TNext;

/**
 * Marks a step that validates unknown input, which is what gives a pipeline its `parse`.
 * @category pipeline
 */
export const parserStep = Symbol("sam.parserStep");
/**
 * Marks a refinement step built from an object pattern, so `issue` can rewrap it.
 * @category pipeline
 */
export const patternStep = Symbol("sam.patternStep");

/**
 * A step that validates unknown input, produced by `schema`.
 * @category pipeline
 */
export type ParserStep<TInput, TOutput> = Step<TInput, TOutput> & {
    readonly [parserStep]: true;
};

type Mutable<T> = {-readonly [K in keyof T]: T[K]};

/**
 * The input narrowed to the members a pattern can match.
 * @category pipeline
 */
export type NarrowByPattern<TInput, TPattern> = TInput extends unknown
    ? TPattern extends Partial<TInput>
        ? Exclude<keyof TPattern, keyof TInput> extends never
            ? TInput & Mutable<TPattern>
            : never
        : never
    : never;

/**
 * Rejects a pattern that could never match the input.
 * @category pipeline
 */
export type CompatiblePattern<TInput, TPattern> = [NarrowByPattern<TInput, TPattern>] extends [never] ? never : unknown;

/**
 * A refinement step built from an object pattern, narrowing whatever input it is given.
 * @category pipeline
 */
export type PatternStep<TPattern extends object> = {
    <TInput>(input: TInput & CompatiblePattern<TInput, TPattern>): NarrowByPattern<TInput, TPattern>;
    readonly [patternStep]: TPattern;
};

/**
 * A step that is not a pattern refinement.
 * @category pipeline
 */
export type RegularStep<TInput, TOutput> = Step<TInput, TOutput> & {
    readonly [patternStep]?: never;
};

/**
 * A chain of steps, extended by `pipe` and executed by `run`.
 * @category pipeline
 */
export interface Pipeline<TInput, TOutput> {
    pipe<TNext>(step: RegularStep<Awaited<TOutput>, TNext>): Pipeline<TInput, PipeResult<TOutput, TNext>>;
    pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): Pipeline<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>>;
    run(value: TInput): TOutput;
}

/**
 * A pipeline rooted in a schema, so it also accepts unknown input through `parse`.
 * @category pipeline
 */
export interface ParsedPipeline<TInput, TOutput> extends Pipeline<TInput, TOutput> {
    pipe<TNext>(step: RegularStep<Awaited<TOutput>, TNext>): ParsedPipeline<TInput, PipeResult<TOutput, TNext>>;
    pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): ParsedPipeline<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>>;
    parse(value: unknown): TOutput;
}

/**
 * A proposed move from one state value to another.
 * @category state
 */
export type StateChange<TState> = {
    readonly from: TState;
    readonly to: TState;
};

/**
 * A shallow pattern matching some members of a state union.
 * @category state
 */
export type StatePattern<TState> = TState extends unknown ? Partial<TState> : never;

/**
 * One state: a readable name, the pattern that identifies it, and the states it may move to.
 * @category state
 */
export type TransitionStateDefinition<TState, TKey extends string = string> = {
    readonly name: string;
    readonly description?: string;
    readonly when: StatePattern<TState>;
    readonly to: readonly TKey[];
};

/**
 * The whole state graph, keyed by stable state identifiers.
 * @category state
 */
export type TransitionDefinition<TState, TKey extends string = string> = Record<
    TKey,
    TransitionStateDefinition<TState, TKey>
>;

/**
 * The state identifiers of a definition.
 * @category state
 */
export type TransitionKey<TDefinition> = Extract<keyof TDefinition, string>;

type PatternOf<TDefinition, TKey extends keyof TDefinition> = TDefinition[TKey] extends {readonly when: infer TPattern}
    ? Mutable<TPattern>
    : never;

/**
 * The state type narrowed to one named state.
 * @category state
 */
export type TransitionState<TState, TDefinition, TKey extends TransitionKey<TDefinition>> = NarrowByPattern<
    TState,
    PatternOf<TDefinition, TKey>
>;

/**
 * Rejects a definition whose pattern could never match the state type.
 * @category state
 */
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

/**
 * The union of every `{from, to}` pair the graph permits.
 * @category state
 */
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
