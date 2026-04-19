import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users } from '../lib/db/schema'

const email = process.argv[2]
if (!email) {
  console.error('Usage: tsx scripts/grant-super-admin.ts <email>')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

const updated = await db
  .update(users)
  .set({ isSuperAdmin: true })
  .where(eq(users.email, email))
  .returning({ id: users.id, email: users.email })

if (!updated.length) {
  console.error(`User not found: ${email}`)
  process.exit(1)
}

console.log(`Super-admin granted to ${updated[0].email} (${updated[0].id})`)
