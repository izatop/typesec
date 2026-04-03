import {Client} from "./class/Client.mjs";
import type {Domain, IClientProtocol} from "./interfaces.mjs";

export function client<TDomain extends Domain<any, any>>(domain: TDomain, protocol: IClientProtocol): Client<TDomain> {
    return new Client(domain, protocol);
}
