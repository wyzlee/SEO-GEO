/**
 * Mock factory pour Drizzle `db` dans les tests API / audit.
 *
 * Le builder est une chain-fluent fake qui supporte :
 *   db.select().from().where().limit()     → Promise<[]>
 *   db.insert().values().returning()       → configurable via returning.mockResolvedValue
 *   db.update().set().where().returning()  → idem
 *   db.insert().values().onConflictDoNothing() → Promise<[]>
 *
 * Le builder est thenable (`then`) pour supporter les queries qui terminent
 * sur `.where()` sans `.limit()` (ex. count queries, cascades).
 *
 * Usage :
 *   const db = createMockDb()
 *   vi.mock('@/lib/db', () => ({ db }))
 *   db.returning.mockResolvedValueOnce([{ id: 'audit-1' }])
 *   db.limit.mockResolvedValueOnce([{ ... }])
 */
import { vi } from 'vitest'

export interface MockDb {
  [k: string]: unknown
  select: () => MockDb
  from: () => MockDb
  where: () => MockDb
  limit: ReturnType<typeof vi.fn>
  orderBy: () => MockDb
  update: () => MockDb
  set: () => MockDb
  returning: ReturnType<typeof vi.fn>
  insert: () => MockDb
  values: () => MockDb
  onConflictDoNothing: ReturnType<typeof vi.fn>
  onConflictDoUpdate: ReturnType<typeof vi.fn>
  delete: () => MockDb
  execute: ReturnType<typeof vi.fn>
  then: (resolve: (v: unknown) => unknown) => unknown
}

export function createMockDb(): MockDb {
  const db: MockDb = {
    select: () => db,
    from: () => db,
    where: () => db,
    limit: vi.fn().mockResolvedValue([]),
    orderBy: () => db,
    update: () => db,
    set: () => db,
    returning: vi.fn().mockResolvedValue([]),
    insert: () => db,
    values: () => db,
    onConflictDoNothing: vi.fn().mockResolvedValue([]),
    onConflictDoUpdate: vi.fn().mockResolvedValue([]),
    delete: () => db,
    execute: vi.fn().mockResolvedValue([]),
    then: (resolve) => resolve([]),
  }
  return db
}

/** Reset tous les mocks internes sans changer la structure. */
export function resetMockDb(db: MockDb): void {
  db.limit.mockReset().mockResolvedValue([])
  db.returning.mockReset().mockResolvedValue([])
  db.onConflictDoNothing.mockReset().mockResolvedValue([])
  db.onConflictDoUpdate.mockReset().mockResolvedValue([])
  db.execute.mockReset().mockResolvedValue([])
}
