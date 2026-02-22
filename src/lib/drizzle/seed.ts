import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { hash } from 'bcryptjs';
import 'dotenv/config';

async function main() {
  console.log('🌱 Starting seed...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  // Create admin user
  const adminPassword = await hash('Admin123!', 10);

  const [admin] = await db
    .insert(schema.users)
    .values({
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: schema.Role.ADMIN,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        password: adminPassword,
        role: schema.Role.ADMIN,
      },
    })
    .returning();

  console.log(`✅ Upserted admin user: ${admin.email}`);

  // Create regular user
  const userPassword = await hash('User1234!', 10);
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'user@example.com',
      name: 'Regular User',
      password: userPassword,
      role: schema.Role.USER,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        password: userPassword,
        role: schema.Role.USER,
      },
    })
    .returning();

  console.log(`✅ Upserted regular user: ${user.email}`);

  console.log('🌱 Seed completed successfully!');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
