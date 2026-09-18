import {async} from "@typesec/the/async";
import {fnify} from "@typesec/the/fn";
import type {Fn} from "@typesec/the/type";
import z from "zod";
import {ParsedPipeline, Pipeline} from "./class/Pipeline.mjs";
import {Transitions} from "./class/Transitions.mjs";
import {RefinementError} from "./errors.mjs";
import type {
    AllowedStateChange,
    ContextSource,
    ContextualPipeline,
    ParsedPipeline as ParsedPipelineContract,
    ParserStep,
    TrustedStep,
    PatternStep,
    Pipeline as PipelineContract,
    StateChange,
    Step,
    TransitionDefinition,
    TransitionKey,
    TransitionState,
    ValidateTransitionDefinition,
} from "./interfaces.mjs";
import {parserStep, patternStep} from "./interfaces.mjs";

type IssueResult<TOutput> = TOutput extends PromiseLike<infer TValue> ? Promise<Awaited<TValue>> : TOutput;

type MapState<TMap> = TMap extends Transitions<infer TState, any> ? TState : never;
type MapDefinition<TMap> = TMap extends Transitions<any, infer TDefinition> ? TDefinition : never;
/**
 * Written as a plain two-parameter signature rather than `Step<..., TContext>`: a conditional type
 * stays deferred while `TContext` is still being inferred, which would cost `TOutput` its literal
 * types. A handler that ignores the context simply declares one parameter.
 */
type MapMatchHandlers<TMap, TOutput, TContext = void> = {
    [TKey in Extract<keyof MapDefinition<TMap>, string>]: (
        state: TransitionState<MapState<TMap>, MapDefinition<TMap>, TKey>,
        context: TContext,
    ) => TOutput;
};

/**
 * Starts a pipeline.
 *
 * Given `schema(...)` it also exposes `parse` for unknown input; given a step, or
 * nothing at all, it starts from a known type. Use `context` instead when the steps need
 * dependencies the value flow should not carry.
 * @category pipeline
 * @example pipeline(schema(z.string())).pipe((value) => value.length)
 * @see context
 */
export function pipeline<TInput, TOutput>(step: ParserStep<TInput, TOutput>): ParsedPipelineContract<TInput, TOutput>;
export function pipeline<TInput>(): PipelineContract<TInput, TInput>;
export function pipeline<TInput, TOutput>(step: Step<TInput, TOutput>): PipelineContract<TInput, TOutput>;
export function pipeline(step: Step<any, any> = (value) => value): PipelineContract<any, any> {
    return parserStep in step ? new ParsedPipeline(step) : new Pipeline(step);
}

/**
 * Starts pipelines that hand every step a context as its second argument.
 *
 * The context carries what a step needs but the value flow should not: a repository, a service, a
 * clock, a tenant, a snapshot taken when the run started. A plain value is fixed when the
 * context is declared; a factory is called again on every `run` or `parse`, which is what a
 * per-request context needs. The result is used like `pipeline` itself, either by calling it or
 * through `pipe`, and one context serves the whole pipeline, including the callbacks given to
 * `match`, `transform`, `refine` and `issue`.
 * @category pipeline
 * @example const withStore = context(() => store.snapshot());
 * @example withStore(schema(Command)).pipe((command, store) => store.load(command.id))
 */
export function context<TContext>(source: ContextSource<TContext>): ContextualPipeline<TContext> {
    const factory = fnify(source) as Fn<[], unknown>;
    const create = (step: Fn<[input: any, context: any], any> = (value) => value) =>
        parserStep in step ? new ParsedPipeline(step, factory) : new Pipeline(step, factory);

    return Object.assign(create, {pipe: create}) as unknown as ContextualPipeline<TContext>;
}

/**
 * Changes a value and validates the result in one step, so the new shape is checked where it is made.
 *
 * The mutator receives the pipeline context as its second argument; the validator is a `schema` or a
 * `trust`, so it takes the value alone. A mutator is synchronous: it turns one value into another and
 * nothing else, and work that has to await belongs in its own step.
 * @category pipeline
 * @example transform(schema(NameSchema), (user) => user.name.trim())
 * @see trust
 */
export function transform<TInput, TNext, TOut, TContext = void>(
    validator: Step<TNext, TOut>,
    mutator: (input: TInput, context: TContext) => TNext,
): Step<TInput, TOut, TContext> {
    return Object.assign((input: TInput, context: TContext) => validator(mutator(input, context)), {
        [parserStep]: true as const,
    }) as unknown as Step<TInput, TOut, TContext>;
}

/**
 * Turns a Zod schema into a validating first stage.
 * @category pipeline
 */
export function schema<TOutput, TInput = unknown>(schema: z.ZodType<TOutput, TInput>): ParserStep<TInput, TOutput> {
    return Object.assign((value: TInput) => schema.parse(value), {[parserStep]: true as const});
}

/**
 * Asserts an input type without checking it, on its own or in front of a step that consumes it.
 *
 * `trust<T>()` passes the value through as `T`; `trust(step)` hands the trusted value to `step` and
 * returns what it returns. Either way the type is written down, never verified, so use it only where
 * the value is already known to hold. The step may take the pipeline context as a second argument.
 *
 * Write the trusted type one way or the other: as the type argument of `trust<T>()`, or as the
 * annotation on the step's input. Supplying only the first of two type arguments — `trust<T>(step)` —
 * does not work, because TypeScript stops inferring the rest as soon as one is given.
 * @category pipeline
 * @example transform(trust<Label>(), (payment) => `#${payment.id}`)
 * @example pipeline<Command>().pipe(trust((command: TrustedCommand) => command.id))
 * @see transform
 */
export function trust<T>(): Step<T, T>;
export function trust<T, TNext>(step: (input: T) => TNext): TrustedStep<TNext>;
export function trust<T, TNext, TContext>(step: (input: T, context: TContext) => TNext): TrustedStep<TNext, TContext>;
export function trust(
    step: Fn<[input: any, context: any], any> = (value) => value,
): Fn<[input: any, context: any], any> {
    return step;
}

/**
 * Narrows a value without changing it, by object pattern, type predicate, or state graph.
 *
 * With a `Transitions` and no key it validates a `{from, to}` change; with a key it
 * narrows one value to that named state. A predicate may take the pipeline context as a second
 * argument, which lets a check depend on a tenant or a limit. A failure throws `RefinementError`.
 * @category pipeline
 * @example pipeline<Operation>().pipe(refine({kind: "avg"}))
 * @see RefinementError
 */
export function refine<
    TState extends object,
    TDefinition extends TransitionDefinition<TState, TransitionKey<TDefinition>>,
>(map: Transitions<TState, TDefinition>): Step<StateChange<TState>, AllowedStateChange<TState, TDefinition>>;
export function refine<
    TState extends object,
    TDefinition extends TransitionDefinition<TState, TransitionKey<TDefinition>>,
    TKey extends TransitionKey<TDefinition>,
>(map: Transitions<TState, TDefinition>, key: TKey): Step<TState, TransitionState<TState, TDefinition, TKey>>;
export function refine<TInput, TOutput extends TInput>(
    predicate: (input: TInput) => input is TOutput,
): Step<TInput, TOutput>;
export function refine<TInput, TOutput extends TInput, TContext>(
    predicate: (input: TInput, context: TContext) => input is TOutput,
): Step<TInput, TOutput, TContext>;
export function refine<const TPattern extends object>(pattern: TPattern): PatternStep<TPattern>;
export function refine(
    refinement: object | Fn<[input: any, context: any], boolean>,
    key?: string,
): Fn<[input: any, context: any], any> {
    if (refinement instanceof Transitions) {
        return key === undefined
            ? (change: StateChange<object>) => {
                  refinement.assert(change.from, change.to);
                  return change;
              }
            : (state: object) => {
                  const resolved = refinement.resolve(state);
                  if (resolved !== key) {
                      throw new RefinementError(`Expected state "${refinement.states[key]?.name ?? key}"`);
                  }

                  return state;
              };
    }

    if (typeof refinement === "function") {
        return (input, context) => {
            if (!refinement(input, context)) {
                throw new RefinementError("Value does not satisfy refinement");
            }

            return input;
        };
    }

    const pattern = refinement as Record<PropertyKey, unknown>;
    const keys = Reflect.ownKeys(pattern);
    if (keys.length === 0) {
        throw new RefinementError("Refinement pattern must not be empty");
    }

    return Object.assign(
        (input: Record<PropertyKey, unknown>) => {
            const matches =
                input !== null && input !== undefined && keys.every((key) => Object.is(input[key], pattern[key]));
            if (!matches) {
                throw new RefinementError("Value does not match refinement pattern");
            }

            return input;
        },
        {[patternStep]: refinement},
    ) as PatternStep<typeof refinement>;
}

/**
 * Builds a state machine from a schema and its state definitions, inferring the state type from the schema.
 *
 * The result validates transitions and resolves which state a value is in; it never changes the value.
 * @category state
 * @example transitions(PaymentSchema, {created: {name: "Created", when: {status: "created"}, to: ["paid"]}})
 * @see match
 */
export function transitions<
    TSchema extends z.ZodType<object, any>,
    const TDefinition extends TransitionDefinition<z.output<TSchema>, TransitionKey<TDefinition>>,
>(
    _schema: TSchema,
    definition: TDefinition & ValidateTransitionDefinition<z.output<TSchema>, TDefinition>,
): Transitions<z.output<TSchema>, TDefinition> {
    return new Transitions<z.output<TSchema>, TDefinition>(definition);
}

/**
 * Resolves the current state and runs the one handler for it.
 *
 * Handlers cover every state in the state machine and each receives its narrowed type, plus the
 * pipeline context as a second argument. Only the selected handler runs.
 * @category state
 * @example match(payments, {created: (payment, ctx) => ctx.provider.start(payment), paid: settle})
 * @see transitions
 */
export function match<const TMap extends Transitions<object, any>, const TOutput, TContext = void>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, TOutput, TContext>,
): Step<MapState<TMap>, TOutput, TContext>;
export function match<const TMap extends Transitions<object, any>, const TOutput, TContext = void>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, Promise<TOutput>, TContext>,
): Step<MapState<TMap>, Promise<TOutput>, TContext>;
export function match<const TMap extends Transitions<object, any>, const TSync, const TAsync, TContext = void>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, TSync | Promise<TAsync>, TContext>,
): Step<MapState<TMap>, TSync | Promise<TAsync>, TContext>;
export function match<const TMap extends Transitions<object, any>, const TSync, const TAsync, TContext = void>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, TSync | PromiseLike<TAsync>, TContext>,
): Step<MapState<TMap>, TSync | PromiseLike<TAsync>, TContext>;
export function match(
    map: Transitions<any, any>,
    handlers: Record<string, Fn<[state: any, context: any], any>>,
): Fn<[state: any, context: any], any> {
    return (state, context) => handlers[map.resolve(state)]!(state as never, context);
}

/**
 * Replaces the error a step raises, keeping its input and output types.
 *
 * Both the wrapped step and the error factory receive the pipeline context, which is the only way an
 * error message can name something the context knows, such as a request id. A step that reads the
 * context has to annotate both of its parameters, because `issue` is built before `pipe` types it.
 * @category pipeline
 * @example issue(schema(IdSchema), "Bad payment id")
 * @see context
 */
export function issue<TInput, TOutput>(
    step: ParserStep<TInput, TOutput>,
    error: string | ((reason: unknown, payload: unknown) => Error),
): ParserStep<TInput, IssueResult<TOutput>>;
export function issue<const TPattern extends object>(
    step: PatternStep<TPattern>,
    error: string | ((reason: unknown, payload: unknown) => Error),
): PatternStep<TPattern>;
export function issue<TInput, TOutput>(
    step: Step<TInput, TOutput>,
    error: string | ((reason: unknown, payload: TInput) => Error),
): Step<TInput, IssueResult<TOutput>>;
export function issue<TInput, TOutput, TContext>(
    step: (input: TInput, context: TContext) => TOutput,
    error: string | ((reason: unknown, payload: TInput, context: TContext) => Error),
): Step<TInput, IssueResult<TOutput>, TContext>;
export function issue(
    step: Fn<[input: any, context: any], any>,
    error: string | ((reason: unknown, payload: any, context: any) => Error),
): Fn<[input: any, context: any], any> {
    const mapError = (reason: unknown, payload: any, context: any): Error =>
        typeof error === "string" ? new Error(error, {cause: reason}) : error(reason, payload, context);

    const wrapped = (payload: any, context: any) => {
        try {
            const result = step(payload, context);

            return async.isThenable(result)
                ? Promise.resolve(result).catch((reason) => {
                      throw mapError(reason, payload, context);
                  })
                : result;
        } catch (reason) {
            throw mapError(reason, payload, context);
        }
    };

    if (parserStep in step) {
        Object.assign(wrapped, {[parserStep]: true as const});
    }
    if (patternStep in step) {
        Object.assign(wrapped, {[patternStep]: step[patternStep]});
    }

    return wrapped;
}
