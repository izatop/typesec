import {Client} from "./class/Client.mts";
import type {Domain, IClientProtocol} from "./interfaces.mts";

export function client<TDomain extends Domain<any, any>>(domain: TDomain, protocol: IClientProtocol): Client<TDomain> {
    return new Client(domain, protocol);
}
