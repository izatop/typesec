import type {Spec} from "@typesec/spec";
import type {Schema} from "./interfaces.mjs";
import type {Reflection} from "./Reflection.mjs";
import {SchemaRef} from "./SchemaRef.mjs";

export function spec<TContext, TSpec extends Spec.Any>(
    context: TContext,
    reflection: Reflection<TSpec>,
    spec: Schema<TContext, TSpec>,
): SchemaRef<TContext, TSpec> {
    return new SchemaRef(reflection, context, spec);
}

type WithContext<TContext> = <TSpec extends Spec.Any>(
    reflection: Reflection<TSpec>,
    spec: Schema<TContext, TSpec>,
) => SchemaRef<TContext, TSpec>;

export function withContext<TContext>(context: TContext): WithContext<TContext> {
    return (reflection, spec) => new SchemaRef(reflection, context, spec) as any;
}
