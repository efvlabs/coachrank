/**
 * A small in-memory stand-in for the Firestore Admin SDK, covering exactly the surface
 * CoachRank uses: documents, transactions, batches, equality/inequality queries, ordering,
 * limits, count aggregations and the FieldValue/Timestamp sentinels.
 *
 * It exists so the money-critical paths - webhook idempotency, cumulative bids, spotlight
 * reservation - are tested against real code rather than mocked-out behaviour.
 */

export class FakeTimestamp {
  constructor(readonly millis: number) {}
  static now() {
    return new FakeTimestamp(Date.now());
  }
  static fromMillis(ms: number) {
    return new FakeTimestamp(ms);
  }
  static fromDate(date: Date) {
    return new FakeTimestamp(date.getTime());
  }
  toMillis() {
    return this.millis;
  }
  toDate() {
    return new Date(this.millis);
  }
  valueOf() {
    return this.millis;
  }
}

const INCREMENT = Symbol("increment");
const SERVER_TIMESTAMP = Symbol("serverTimestamp");

type Sentinel =
  | { [INCREMENT]: number }
  | { [SERVER_TIMESTAMP]: true };

export const FakeFieldValue = {
  increment(by: number) {
    return { [INCREMENT]: by } as Sentinel;
  },
  serverTimestamp() {
    return { [SERVER_TIMESTAMP]: true } as Sentinel;
  },
};

function isIncrement(value: unknown): value is { [INCREMENT]: number } {
  return typeof value === "object" && value !== null && INCREMENT in value;
}
function isServerTimestamp(value: unknown): boolean {
  return typeof value === "object" && value !== null && SERVER_TIMESTAMP in value;
}

type Doc = Record<string, unknown>;

function clone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof FakeTimestamp) return value;
  if (Array.isArray(value)) return value.map(clone) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = clone(v);
  return out as T;
}

/** Applies a partial update, honouring dotted paths and FieldValue sentinels. */
function applyUpdate(target: Doc, patch: Doc): Doc {
  const next = clone(target);
  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined) continue;

    let value: unknown = raw;
    if (isServerTimestamp(raw)) value = FakeTimestamp.now();

    const path = key.split(".");
    let cursor: Record<string, unknown> = next;
    for (let i = 0; i < path.length - 1; i += 1) {
      const segment = path[i];
      if (typeof cursor[segment] !== "object" || cursor[segment] === null) cursor[segment] = {};
      cursor = cursor[segment] as Record<string, unknown>;
    }
    const leaf = path[path.length - 1];

    if (isIncrement(raw)) {
      const current = typeof cursor[leaf] === "number" ? (cursor[leaf] as number) : 0;
      cursor[leaf] = current + raw[INCREMENT];
    } else {
      cursor[leaf] = value;
    }
  }
  return next;
}

function compareValues(a: unknown, b: unknown): number {
  const av = a instanceof FakeTimestamp ? a.toMillis() : a;
  const bv = b instanceof FakeTimestamp ? b.toMillis() : b;
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv));
}

function matches(doc: Doc, field: string, op: string, value: unknown): boolean {
  const actual = doc[field];
  switch (op) {
    case "==":
      return compareValues(actual, value) === 0;
    case "!=":
      return compareValues(actual, value) !== 0;
    case ">":
      return compareValues(actual, value) > 0;
    case ">=":
      return compareValues(actual, value) >= 0;
    case "<":
      return compareValues(actual, value) < 0;
    case "<=":
      return compareValues(actual, value) <= 0;
    default:
      throw new Error(`Unsupported operator ${op}`);
  }
}

export class FakeDocSnapshot {
  constructor(
    readonly id: string,
    private readonly value: Doc | undefined,
    readonly ref: FakeDocRef,
  ) {}
  get exists() {
    return this.value !== undefined;
  }
  data() {
    return this.value === undefined ? undefined : clone(this.value);
  }
}

export class FakeDocRef {
  constructor(
    readonly store: FakeFirestore,
    readonly collectionName: string,
    readonly id: string,
  ) {}

  get path() {
    return `${this.collectionName}/${this.id}`;
  }

  async get() {
    return new FakeDocSnapshot(this.id, this.store.read(this.collectionName, this.id), this);
  }

  async set(data: Doc, options?: { merge?: boolean }) {
    this.store.write(this.collectionName, this.id, data, options?.merge ?? false);
  }

  async create(data: Doc) {
    if (this.store.read(this.collectionName, this.id) !== undefined) {
      const error = new Error(`Document already exists: ${this.path}`);
      (error as Error & { code: number }).code = 6;
      throw error;
    }
    this.store.write(this.collectionName, this.id, data, false);
  }

  async update(data: Doc) {
    if (this.store.read(this.collectionName, this.id) === undefined) {
      throw new Error(`No document to update: ${this.path}`);
    }
    this.store.write(this.collectionName, this.id, data, true);
  }

  async delete() {
    this.store.remove(this.collectionName, this.id);
  }
}

type Filter = { field: string; op: string; value: unknown };
type Order = { field: string; direction: "asc" | "desc" };

export class FakeQuery {
  constructor(
    protected readonly store: FakeFirestore,
    protected readonly collectionName: string,
    protected readonly filters: Filter[] = [],
    protected readonly orders: Order[] = [],
    protected readonly limitCount: number | null = null,
    protected readonly offsetCount = 0,
  ) {}

  where(field: string, op: string, value: unknown): FakeQuery {
    return new FakeQuery(
      this.store,
      this.collectionName,
      [...this.filters, { field, op, value }],
      this.orders,
      this.limitCount,
      this.offsetCount,
    );
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc"): FakeQuery {
    return new FakeQuery(
      this.store,
      this.collectionName,
      this.filters,
      [...this.orders, { field, direction }],
      this.limitCount,
      this.offsetCount,
    );
  }

  limit(n: number): FakeQuery {
    return new FakeQuery(this.store, this.collectionName, this.filters, this.orders, n, this.offsetCount);
  }

  offset(n: number): FakeQuery {
    return new FakeQuery(this.store, this.collectionName, this.filters, this.orders, this.limitCount, n);
  }

  count() {
    return {
      get: async () => ({ data: () => ({ count: this.resolve().length }) }),
    };
  }

  protected resolve(): { id: string; doc: Doc }[] {
    const collection = this.store.collectionMap(this.collectionName);
    let rows = [...collection.entries()].map(([id, doc]) => ({ id, doc }));

    for (const filter of this.filters) {
      rows = rows.filter((row) => matches(row.doc, filter.field, filter.op, filter.value));
    }

    for (const order of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const result = compareValues(a.doc[order.field], b.doc[order.field]);
        return order.direction === "desc" ? -result : result;
      });
    }

    if (this.offsetCount) rows = rows.slice(this.offsetCount);
    if (this.limitCount !== null) rows = rows.slice(0, this.limitCount);
    return rows;
  }

  async get() {
    const rows = this.resolve();
    const docs = rows.map(
      (row) =>
        new FakeDocSnapshot(row.id, row.doc, new FakeDocRef(this.store, this.collectionName, row.id)),
    );
    return { empty: docs.length === 0, size: docs.length, docs };
  }
}

export class FakeCollectionRef extends FakeQuery {
  doc(id?: string) {
    return new FakeDocRef(this.store, this.collectionName, id ?? this.store.nextId());
  }

  async add(data: Doc) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

type PendingWrite =
  | { kind: "set"; collection: string; id: string; data: Doc; merge: boolean }
  | { kind: "create"; collection: string; id: string; data: Doc }
  | { kind: "update"; collection: string; id: string; data: Doc }
  | { kind: "delete"; collection: string; id: string };

class FakeTransaction {
  readonly writes: PendingWrite[] = [];
  constructor(private readonly store: FakeFirestore) {}

  async get(refOrQuery: FakeDocRef | FakeQuery) {
    if (refOrQuery instanceof FakeDocRef) return refOrQuery.get();
    return (refOrQuery as FakeQuery).get();
  }

  set(ref: FakeDocRef, data: Doc, options?: { merge?: boolean }) {
    this.writes.push({
      kind: "set",
      collection: ref.collectionName,
      id: ref.id,
      data,
      merge: options?.merge ?? false,
    });
  }

  create(ref: FakeDocRef, data: Doc) {
    this.writes.push({ kind: "create", collection: ref.collectionName, id: ref.id, data });
  }

  update(ref: FakeDocRef, data: Doc) {
    this.writes.push({ kind: "update", collection: ref.collectionName, id: ref.id, data });
  }

  delete(ref: FakeDocRef) {
    this.writes.push({ kind: "delete", collection: ref.collectionName, id: ref.id });
  }
}

class FakeBatch {
  private readonly writes: PendingWrite[] = [];
  constructor(private readonly store: FakeFirestore) {}
  set(ref: FakeDocRef, data: Doc, options?: { merge?: boolean }) {
    this.writes.push({
      kind: "set",
      collection: ref.collectionName,
      id: ref.id,
      data,
      merge: options?.merge ?? false,
    });
  }
  update(ref: FakeDocRef, data: Doc) {
    this.writes.push({ kind: "update", collection: ref.collectionName, id: ref.id, data });
  }
  delete(ref: FakeDocRef) {
    this.writes.push({ kind: "delete", collection: ref.collectionName, id: ref.id });
  }
  async commit() {
    this.store.commit(this.writes);
  }
}

export class FakeFirestore {
  private readonly collections = new Map<string, Map<string, Doc>>();
  private counter = 0;

  settings() {
    /* no-op, matches the real API surface */
  }

  nextId() {
    this.counter += 1;
    return `id_${String(this.counter).padStart(6, "0")}`;
  }

  collectionMap(name: string) {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new Map();
      this.collections.set(name, collection);
    }
    return collection;
  }

  collection(name: string) {
    return new FakeCollectionRef(this, name);
  }

  read(collection: string, id: string): Doc | undefined {
    return this.collectionMap(collection).get(id);
  }

  write(collection: string, id: string, data: Doc, merge: boolean) {
    const map = this.collectionMap(collection);
    const existing = map.get(id);
    if (merge && existing) map.set(id, applyUpdate(existing, data));
    else map.set(id, applyUpdate({}, data));
  }

  remove(collection: string, id: string) {
    this.collectionMap(collection).delete(id);
  }

  commit(writes: PendingWrite[]) {
    for (const write of writes) {
      switch (write.kind) {
        case "set":
          this.write(write.collection, write.id, write.data, write.merge);
          break;
        case "create":
          if (this.read(write.collection, write.id) !== undefined) {
            throw new Error(`Document already exists: ${write.collection}/${write.id}`);
          }
          this.write(write.collection, write.id, write.data, false);
          break;
        case "update":
          if (this.read(write.collection, write.id) === undefined) {
            throw new Error(`No document to update: ${write.collection}/${write.id}`);
          }
          this.write(write.collection, write.id, write.data, true);
          break;
        case "delete":
          this.remove(write.collection, write.id);
          break;
      }
    }
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    const tx = new FakeTransaction(this);
    const result = await fn(tx);
    this.commit(tx.writes);
    return result;
  }

  batch() {
    return new FakeBatch(this);
  }

  reset() {
    this.collections.clear();
    this.counter = 0;
  }

  /** Test helper: read a document straight out of the store. */
  peek(collection: string, id: string): Doc | undefined {
    const value = this.read(collection, id);
    return value === undefined ? undefined : clone(value);
  }

  /** Test helper: every document in a collection. */
  all(collection: string): { id: string; doc: Doc }[] {
    return [...this.collectionMap(collection).entries()].map(([id, doc]) => ({ id, doc: clone(doc) }));
  }
}

export const fakeDb = new FakeFirestore();
