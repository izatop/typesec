import {async} from "@typesec/the/async";
import type z from "zod";
import {ParsedPipeline, Pipeline} from "./class/Pipeline.mjs";
import {Transitions} from "./class/Transitions.mjs";
import {RefinementError} from "./errors.mjs";
import type {
    AllowedStateChange,
    ParsedPipeline as ParsedPipelineContract,
    ParserStep,
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
type MapMatchHandlers<TMap, TOutput> = {
    [TKey in Extract<keyof MapDefinition<TMap>, string>]: Step<
        TransitionState<MapState<TMap>, MapDefinition<TMap>, TKey>,
        TOutput
    >;
};

export function pipeline<TInput, TOutput>(step: ParserStep<TInput, TOutput>): ParsedPipelineContract<TInput, TOutput>;
export function pipeline<TInput>(): PipelineContract<TInput, TInput>;
export function pipeline<TInput, TOutput>(step: Step<TInput, TOutput>): PipelineContract<TInput, TOutput>;
export function pipeline(step: Step<any, any> = (value) => value): PipelineContract<any, any> {
    return parserStep in step ? new ParsedPipeline(step) : new Pipeline(step);
}

export function schema<TOutput, TInput = unknown>(schema: z.ZodType<TOutput, TInput>): ParserStep<TInput, TOutput> {
    return Object.assign((value: TInput) => schema.parse(value), {[parserStep]: true as const});
}

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
export function refine<const TPattern extends object>(pattern: TPattern): PatternStep<TPattern>;
export function refine(refinement: object | ((input: any) => boolean), key?: string): Step<any, any> {
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
        return (input) => {
            if (!refinement(input)) {
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

export function transitions<
    TSchema extends z.ZodType<object, any>,
    const TDefinition extends TransitionDefinition<z.output<TSchema>, TransitionKey<TDefinition>>,
>(
    _schema: TSchema,
    definition: TDefinition & ValidateTransitionDefinition<z.output<TSchema>, TDefinition>,
): Transitions<z.output<TSchema>, TDefinition> {
    return new Transitions<z.output<TSchema>, TDefinition>(definition);
}

export function match<const TMap extends Transitions<object, any>, const TOutput>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, TOutput>,
): Step<MapState<TMap>, TOutput>;
export function match<const TMap extends Transitions<object, any>, const TOutput>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, Promise<TOutput>>,
): Step<MapState<TMap>, Promise<TOutput>>;
export function match<const TMap extends Transitions<object, any>, const TSync, const TAsync>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, TSync | Promise<TAsync>>,
): Step<MapState<TMap>, TSync | Promise<TAsync>>;
export function match<const TMap extends Transitions<object, any>, const TSync, const TAsync>(
    map: TMap,
    handlers: MapMatchHandlers<TMap, TSync | PromiseLike<TAsync>>,
): Step<MapState<TMap>, TSync | PromiseLike<TAsync>>;
export function match(map: Transitions<any, any>, handlers: Record<string, (state: any) => any>): Step<any, any> {
    return (state) => handlers[map.resolve(state)]!(state as never);
}

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
export function issue(
    step: Step<any, any>,
    error: string | ((reason: unknown, payload: any) => Error),
): Step<any, any> {
    const mapError = (reason: unknown, payload: any): Error =>
        typeof error === "string" ? new Error(error, {cause: reason}) : error(reason, payload);

    const wrapped = (payload: any) => {
        try {
            const result = step(payload);

            return async.isThenable(result)
                ? Promise.resolve(result).catch((reason) => {
                      throw mapError(reason, payload);
                  })
                : result;
        } catch (reason) {
            throw mapError(reason, payload);
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
