import {Client} from "./class/Client.mjs";
import type {Domain, IClientProtocol} from "./interfaces.mjs";

/**
 * Builds a typed caller for a domain over the given transport.
 * @category rpc
 * @example client(TestDomain, new ClientFetchProtocol("/rpc"))
 */
export function client<TDomain extends Domain<any, any>>(domain: TDomain, protocol: IClientProtocol): Client<TDomain> {
    return new Client(domain, protocol);
}
