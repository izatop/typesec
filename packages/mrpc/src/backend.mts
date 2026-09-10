import {Backend} from "./class/Backend.mjs";
import {type ContextualBackend, type Domain, type Implementation} from "./interfaces.mjs";

/**
 * Implements a domain by pairing each contract with a procedure.
 * @category rpc
 * @example backend(TestDomain, {strings: {count: procedure(StringCountContract, ({input}) => input.length)}})
 */
export function backend<
    TContext,
    TDomain extends Domain<any, any>,
    TImpl extends Implementation<TContext, Domain.Infer<TDomain>>,
>(domain: TDomain, impl: TImpl): Backend<TContext, TDomain, TImpl> {
    return new Backend(domain, impl);
}

/**
 * Fixes the context type once, so every backend built through it shares it.
 * @category rpc
 * @example const backend = contextual<Math>();
 */
export function contextual<TContext>(): ContextualBackend<TContext> {
    return (domain, impl) => backend(domain, impl);
}
