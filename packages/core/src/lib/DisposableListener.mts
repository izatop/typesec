import type {Fn} from "@typesec/the";

export class DisposableListener extends DisposableStack {
    public createDisposableListener<A extends any[], R>(
        listener: Fn<A, R>,
        listen: (listener: Fn<A, R>) => unknown,
        dispose: (listener: Fn<A, R>) => unknown,
    ): Fn<A, R> {
        listen(listener);
        this.defer(() => dispose(listener));

        return listener;
    }
}
