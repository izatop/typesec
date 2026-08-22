import {async} from "@typesec/the/async";
import type {
    CompatiblePattern,
    NarrowByPattern,
    PatternStep,
    ParsedPipeline as ParsedPipelineContract,
    Pipeline as PipelineContract,
    PipeResult,
    RegularStep,
    Step,
} from "../interfaces.mts";

export class Pipeline<TInput, TOutput> implements PipelineContract<TInput, TOutput> {
    readonly #step: Step<TInput, TOutput>;

    constructor(step: Step<TInput, TOutput>) {
        this.#step = step;
    }

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

    public run(value: TInput): TOutput {
        return this.#step(value);
    }

    protected create<TNext>(step: Step<TInput, TNext>): PipelineContract<TInput, TNext> {
        return new Pipeline(step);
    }
}

export class ParsedPipeline<TInput, TOutput> extends Pipeline<TInput, TOutput> {
    public parse(value: unknown): TOutput {
        return this.run(value as TInput);
    }

    protected override create<TNext>(step: Step<TInput, TNext>): ParsedPipelineContract<TInput, TNext> {
        return new ParsedPipeline(step) as unknown as ParsedPipelineContract<TInput, TNext>;
    }
}
