import type {Fnify} from "@typesec/the/type";

/**
 * One pipeline stage: a plain function from input to output, plus the pipeline context when there is one.
 *
 * Without a context `Step<TInput, TOutput>` stays exactly a one-argument function, so every step
 * written before contexts existed keeps its type and its call sites.
 * @category pipeline
 */
export type Step<TInput, TOutput, TContext = void> = [TContext] extends [void]
    ? (input: TInput) => TOutput
    : (input: TInput, context: TContext) => TOutput;

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
export type RegularStep<TInput, TOutput, TContext = void> = Step<TInput, TOutput, TContext> & {
    readonly [patternStep]?: never;
};

/**
 * A chain of steps, extended by `pipe` and executed by `run`.
 * @category pipeline
 */
export interface Pipeline<TInput, TOutput, TContext = void> {
    pipe<TNext>(
        step: RegularStep<Awaited<TOutput>, TNext, TContext>,
    ): Pipeline<TInput, PipeResult<TOutput, TNext>, TContext>;
    pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): Pipeline<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>, TContext>;
    run(value: TInput): TOutput;
}

/**
 * A pipeline rooted in a schema, so it also accepts unknown input through `parse`.
 * @category pipeline
 */
export interface ParsedPipeline<TInput, TOutput, TContext = void> extends Pipeline<TInput, TOutput, TContext> {
    pipe<TNext>(
        step: RegularStep<Awaited<TOutput>, TNext, TContext>,
    ): ParsedPipeline<TInput, PipeResult<TOutput, TNext>, TContext>;
    pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): ParsedPipeline<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>, TContext>;
    parse(value: unknown): TOutput;
}

/**
 * A step that takes whatever the pipeline hands it, on the author's word that the value holds.
 *
 * Nothing is checked, so the trusted type lives only in the annotation that produced this step. That
 * is what lets it stand where the pipeline's own type is wider, or unknown.
 * @category pipeline
 */
export type TrustedStep<TOutput, TContext = void> = [TContext] extends [void]
    ? {<TInput>(input: TInput): TOutput}
    : {<TInput>(input: TInput, context: TContext): TOutput};

/**
 * How a pipeline context is produced: a ready value, or a factory called again on every run.
 * @category pipeline
 */
export type ContextSource<TContext> = Fnify<TContext>;

/**
 * A pipeline starter bound to one context type, mirroring `pipeline` and also usable through `pipe`.
 *
 * Both forms are the same function, so `withContext(step)` and `withContext.pipe(step)` build the
 * same pipeline. An asynchronous context promises everything the pipeline produces, while the steps
 * themselves always receive the resolved value.
 * @category pipeline
 */
export type ContextualPipeline<TContext> = {
    <TInput, TOutput>(
        step: ParserStep<TInput, TOutput>,
    ): ParsedPipeline<TInput, PipeResult<TContext, TOutput>, Awaited<TContext>>;
    <TInput>(): Pipeline<TInput, PipeResult<TContext, TInput>, Awaited<TContext>>;
    <TInput, TOutput>(
        step: Step<TInput, TOutput, Awaited<TContext>>,
    ): Pipeline<TInput, PipeResult<TContext, TOutput>, Awaited<TContext>>;

    /** The same starter under a name that reads as a chain; `pipe(step)` is `withContext(step)`. */
    readonly pipe: ContextualPipeline<TContext>;
};

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
