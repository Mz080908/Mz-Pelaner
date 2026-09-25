// Type declarations for Node.js built-in modules without @types
// node:sqlite is available in Node 22.5+ but types aren't in @types/node yet

declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(filename: string);
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
  }

  export interface Statement {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    iterate(...params: unknown[]): IterableIterator<unknown>;
    bind(...params: unknown[]): this;
    reset(): this;
  }
}