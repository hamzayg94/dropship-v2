import { getDb } from '@/lib/db'

interface LogParams {
  user: string
  action: string
  entityType?: string
  entityId?: string
  detail?: string
  oldValue?: string
  newValue?: string
}

export function logActivity(p: LogParams) {
  try {
    getDb().prepare(`
      INSERT INTO logs (user, action, entity_type, entity_id, detail, old_value, new_value)
      VALUES (?,?,?,?,?,?,?)
    `).run(p.user, p.action, p.entityType ?? null, p.entityId ?? null, p.detail ?? null, p.oldValue ?? null, p.newValue ?? null)
  } catch (_) {
    // Never let logging crash the main flow
  }
}
