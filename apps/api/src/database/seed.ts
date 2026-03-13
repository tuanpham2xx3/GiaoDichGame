/**
 * Seed script – chạy một lần để tạo dữ liệu ban đầu:
 *   - Roles: USER (system), ADMIN (system), Mod
 *   - Permissions: 11 permissions hệ thống
 *   - Role assignments: gán permissions cho role Mod
 *
 * Usage: npm run db:seed (trong apps/api)
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { roles, permissions, rolePermissions } from './schema';

const client = postgres({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'giaodichgame',
  username: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASS ?? 'apppassword',
});

const db = drizzle(client);

// ----------------------------------------------------------------
// Seed data
// ----------------------------------------------------------------

const SYSTEM_ROLES = [
  { name: 'USER', description: 'Người dùng thông thường, gán mặc định khi đăng ký', isSystem: true },
  { name: 'ADMIN', description: 'Quản trị viên hệ thống, toàn quyền', isSystem: true },
  { name: 'Mod', description: 'Quản lý nội dung và giải quyết tranh chấp', isSystem: false },
] as const;

const SYSTEM_PERMISSIONS = [
  { key: 'game:manage',        description: 'Quản lý danh mục game và schema' },
  { key: 'dispute:resolve',    description: 'Xét xử tranh chấp' },
  { key: 'user:manage',        description: 'Quản lý tài khoản người dùng' },
  { key: 'user:assign_role',   description: 'Phong / thu hồi role cho user' },
  { key: 'role:manage',        description: 'Tạo / sửa / xóa role và permissions' },
  { key: 'vip:manage',         description: 'Quản lý gói VIP' },
  { key: 'pin:manage',         description: 'Quản lý giá và cấu hình Pin bài' },
  { key: 'topup:confirm',      description: 'Xác nhận nạp tiền thủ công' },
  { key: 'listing:moderate',   description: 'Kiểm duyệt và xóa bài đăng' },
  { key: 'stats:view',         description: 'Xem thống kê hệ thống' },
  { key: 'profile:edit',       description: 'Chỉnh sửa thông tin cá nhân' },
] as const;

// Permissions gán cho USER (quyền cơ bản)
const USER_PERMISSION_KEYS = [
  'profile:edit',
];

// Permissions gán cho Mod (không bao gồm quyền quản trị hệ thống)
const MOD_PERMISSION_KEYS = [
  'game:manage',
  'dispute:resolve',
  'listing:moderate',
  'topup:confirm',
  'stats:view',
];

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // ---- 1. Insert Roles ----
  console.log('📌 Inserting roles...');
  const insertedRoles = await db
    .insert(roles)
    .values(SYSTEM_ROLES.map((r) => ({ ...r })))
    .onConflictDoNothing({ target: roles.name })
    .returning();

  console.log(`   ✓ ${insertedRoles.length} roles inserted (or already exist)`);

  // ---- 2. Insert Permissions ----
  console.log('📌 Inserting permissions...');
  const insertedPermissions = await db
    .insert(permissions)
    .values(SYSTEM_PERMISSIONS.map((p) => ({ ...p })))
    .onConflictDoNothing({ target: permissions.key })
    .returning();

  console.log(`   ✓ ${insertedPermissions.length} permissions inserted (or already exist)`);

  // ---- 3. Assign permissions to roles ----
  console.log('📌 Assigning permissions to roles...');

  // Fetch current state from DB
  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);

  const userRole = allRoles.find((r) => r.name === 'USER');
  const modRole = allRoles.find((r) => r.name === 'Mod');
  if (!userRole || !modRole) {
    throw new Error('USER or Mod role not found after insert!');
  }

  // Assign profile:edit to USER role
  const userPermissionIds = allPermissions
    .filter((p) => USER_PERMISSION_KEYS.includes(p.key))
    .map((p) => p.id);

  if (userPermissionIds.length > 0) {
    await db
      .insert(rolePermissions)
      .values(userPermissionIds.map((permId) => ({ roleId: userRole.id, permissionId: permId })))
      .onConflictDoNothing();
    console.log(`   ✓ ${userPermissionIds.length} permissions assigned to USER`);
  }

  const modPermissionIds = allPermissions
    .filter((p) => MOD_PERMISSION_KEYS.includes(p.key))
    .map((p) => p.id);

  if (modPermissionIds.length > 0) {
    await db
      .insert(rolePermissions)
      .values(modPermissionIds.map((permId) => ({ roleId: modRole.id, permissionId: permId })))
      .onConflictDoNothing();
    console.log(`   ✓ ${modPermissionIds.length} permissions assigned to Mod`);
  }

  // ---- Summary ----
  console.log('\n✅ Seed completed successfully!\n');
  console.log('Roles created:');
  allRoles.forEach((r) => console.log(`  - ${r.name} (system: ${r.isSystem})`));
  console.log('\nPermissions created:');
  allPermissions.forEach((p) => console.log(`  - ${p.key}`));

  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  void client.end();
  process.exit(1);
});
