export interface IContext {
    todos: ITodo[];
    users: IUser[];
}

export type TodoStatus = "created" | "pending" | "done";

export interface IUser {
    id: number;
    name: string;
}

export interface IFile {
    name: string;
    uri: string;
    type: string;
}

export interface ITodo {
    id: number;
    title: string;
    description?: string;
    status: TodoStatus;
    checklist?: ICheckList[];
    updatedAt?: Date;
    userId: number;
    attachments?: IFile[];
}

export interface ICheckList {
    id: number;
    description: string;
    done: boolean;
}
