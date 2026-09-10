import {async} from "@typesec/the/async";
import type {
    CompatiblePattern,
    NarrowByPattern,
    ParsedPipeline as ParsedPipelineContract,
    PatternStep,
    Pipeline as PipelineContract,
    PipeResult,
    RegularStep,
    Step,
} from "../interfaces.mjs";

/**
 * A pipeline over a typed input, staying synchronous until a stage returns a thenable.
 * @category pipeline
 */
export class Pipeline<TInput, TOutput> implements PipelineContract<TInput, TOutput> {
    readonly #step: Step<TInput, TOutput>;

    constructor(step: Step<TInput, TOutput>) {
        this.#step = step;
    }

    /** Appends a stage, which receives the awaited output of the one before it. */
    public pipe<TNext>(
        step: RegularStep<Awaited<TOutput>, TNext>,
    ): PipelineContract<TInput, PipeResult<TOutput, TNext>>;
    public pipe<const TPattern extends object>(
        step: PatternStep<TPattern> & CompatiblePattern<Awaited<TOutput>, TPattern>,
    ): PipelineContract<TInput, PipeResult<TOutput, NarrowByPattern<Awaited<TOutput>, TPattern>>>;
    public pipe(step: Step<any, any>): PipelineContract<TInput, any> {
        return this.create((value: TInput) => {
            const result = this.run(value);

            return async.isThenable(result) ? Promise.resolve(result).then(step) : step(result as Awaited<TOutput>);
        });
    }

    /** Runs the chain over a value of the pipeline's input type. */
    public run(value: TInput): TOutput {
        return this.#step(value);
    }

    protected create<TNext>(step: Step<TInput, TNext>): PipelineContract<TInput, TNext> {
        return new Pipeline(step);
    }
}

/**
 * A pipeline rooted in a schema, which may therefore start from unknown input.
 * @category pipeline
 */
export class ParsedPipeline<TInput, TOutput> extends Pipeline<TInput, TOutput> {
    /** Validates unknown input with the root schema and runs the remaining stages. */
    public parse(value: unknown): TOutput {
        return this.run(value as TInput);
    }

    protected override create<TNext>(step: Step<TInput, TNext>): ParsedPipelineContract<TInput, TNext> {
        return new ParsedPipeline(step) as unknown as ParsedPipelineContract<TInput, TNext>;
    }
}
