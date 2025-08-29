export type Member<T> = () => T;

export namespace Member {
    export type Is<M> = M extends Member<any> ? true : false;
    export type Infer<M> = M extends Member<infer T> ? T : never;
}
