import type {Query, Spec} from "@typesec/spec";
import {toEntries} from "@typesec/the";
import type {Schema} from "./interfaces.mjs";
import type {Reflection} from "./Reflection.mjs";

export class SchemaRef<TContext, TSpec extends Spec.Any> {
    public readonly context: TContext;
    public readonly schema: Schema<TContext, TSpec>;
    public readonly reflection: Reflection<TSpec>;

    constructor(reflection: Reflection<TSpec>, context: TContext, schema: Schema<TContext, TSpec>) {
        this.reflection = reflection;
        this.context = context;
        this.schema = schema;
    }

    public async resolve<TQuery extends Query<TSpec>>(query: TQuery): Promise<Query.Resolve<TSpec, TQuery>> {
        for (const entry of toEntries(query)) {
            console.log(entry);
        }

        return {} as unknown as Query.Resolve<TSpec, TQuery>;
    }

    public getSpecification() {}
}
