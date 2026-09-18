import {async} from "@typesec/the/async";
import type {Fn} from "@typesec/the/type";
import type {
    CompatiblePattern,
    NarrowByPattern,
    ParsedPipeline as ParsedPipelineContract,
    PatternStep,
    Pipeline as PipelineContract,
    PipeResult,
    RegularStep,
} from "../interfaces.mjs";

/**
 * The internal shape of a stage: input first, context second.
 *
 * `Step<TInput, TOutput, TContext>` is a conditional type, so it stays deferred while `TContext` is
 * an unresolved parameter; the chain uses this loose shape instead and the public overloads keep the
 * precise one.
 */
type ChainStep = Fn<[input: any, context: any], any>;

/**
 * A pipeline over a typed input, staying synchronous until a stage returns a thenable.
 * @category pipeline
 */
export class Pipeline<TInput, TOutput, TContext = void> implements PipelineContract<TInput, TOutput, TContext> {
    readonly #step: ChainStep;

    /** Resolves the context once per run; absent on a pipeline that carries no context. */
    protected readonly contextFactory: Fn<[], unknown> | undefined;

    constructor(step: ChainStep, contextFactory?: Fn<[], unknown>) {
        this.#step = step;
        this.contextFactory = contextFactory;
    }

    /** Appends a stage, which receives the awaited output of the one before it and the pipeline context. */
    public pipe<TNext>(
        step: RegularStep<Awaited<TOutput>, TNext, TContext>,
    ): PipelineContract<TInput, PipeResult<TOutput, TNext>, TContext>;
    public pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): PipelineContract<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>, TContext>;
    public pipe(step: ChainStep): PipelineContract<TInput, any, TContext> {
        const previous = this.#step;

        return this.create((value, context) => {
            const result = previous(value, context);

            return async.isThenable(result)
                ? Promise.resolve(result).then((resolved) => step(resolved, context))
                : step(result, context);
        });
    }

    /** Runs the chain over a value of the pipeline's input type, resolving the context once. */
    public run(value: TInput): TOutput {
        const context = this.contextFactory?.();

        return (
            async.isThenable(context)
                ? Promise.resolve(context).then((resolved) => this.#step(value, resolved))
                : this.#step(value, context)
        ) as TOutput;
    }

    protected create(step: ChainStep): PipelineContract<TInput, any, TContext> {
        return new Pipeline(step, this.contextFactory);
    }
}

/**
 * A pipeline rooted in a schema, which may therefore start from unknown input.
 * @category pipeline
 */
export class ParsedPipeline<TInput, TOutput, TContext = void> extends Pipeline<TInput, TOutput, TContext> {
    /** Validates unknown input with the root schema and runs the remaining stages. */
    public parse(value: unknown): TOutput {
        return this.run(value as TInput);
    }

    protected override create(step: ChainStep): ParsedPipelineContract<TInput, any, TContext> {
        return new ParsedPipeline(step, this.contextFactory) as unknown as ParsedPipelineContract<
            TInput,
            any,
            TContext
        >;
    }
}
