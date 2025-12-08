import {Backend} from "./class/Backend.mts";
import {type ContextualBackend, type Domain, type Implementation} from "./interfaces.mts";

export function backend<TContext, TDomain extends Domain<any, any>>(
    domain: TDomain,
    impl: Implementation<TContext, Domain.Infer<TDomain>>,
): Backend<TContext, TDomain, Implementation<TContext, Domain.Infer<TDomain>>> {
    return new Backend(domain, impl);
}

export function contextual<TContext>(): ContextualBackend<TContext> {
    return (domain, impl) => backend(domain, impl);
}
