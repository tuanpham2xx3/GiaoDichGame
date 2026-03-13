/**
 * Seed script – chạy một lần để tạo dữ liệu ban đầu:
 *   - Roles: USER (system), ADMIN (system), Mod, SELLER, BUYER
 *   - Permissions: 20 permissions hệ thống
 *   - Role assignments: gán permissions cho role Mod, USER
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
  { name: 'SELLER', description: 'Người bán, có quyền đăng bài, giao hàng, quản lý bảo hiểm', isSystem: false },
  { name: 'BUYER', description: 'Người mua, có quyền mua hàng và xem đơn', isSystem: false },
] as const;

const SYSTEM_PERMISSIONS = [
  // Auth/Profile
  { key: 'profile:edit', description: 'Chỉnh sửa thông tin cá nhân' },

  // User Management
  { key: 'user:manage', description: 'Quản lý tài khoản người dùng (block/unblock)' },
  { key: 'user:assign_role', description: 'Phong / thu hồi role cho user' },

  // Role Management
  { key: 'role:manage', description: 'Tạo / sửa / xóa role và permissions' },

  // Game
  { key: 'game:manage', description: 'Quản lý danh mục game và schema' },

  // Listing
  { key: 'listing:moderate', description: 'Kiểm duyệt và xóa bài đăng' },
  { key: 'listing:create', description: 'Đăng bài bán' },
  { key: 'listing:edit', description: 'Sửa bài đăng' },
  { key: 'listing:delete', description: 'Xóa bài đăng' },
  { key: 'listing:pin', description: 'Mua pin cho bài đăng' },

  // Order
  { key: 'order:buy', description: 'Mua hàng' },
  { key: 'order:deliver', description: 'Giao thông tin tài khoản game' },
  { key: 'order:view_own', description: 'Xem đơn hàng của mình' },

  // Wallet
  { key: 'topup:confirm', description: 'Xác nhận nạp tiền thủ công' },
  { key: 'withdraw:approve', description: 'Duyệt rút tiền' },
  { key: 'insurance:manage', description: 'Quản lý quỹ bảo hiểm' },

  // Dispute
  { key: 'dispute:resolve', description: 'Xét xử tranh chấp' },

  // VIP/Pin
  { key: 'vip:manage', description: 'Quản lý gói VIP' },
  { key: 'pin:manage', description: 'Quản lý giá và cấu hình Pin bài' },

  // Stats
  { key: 'stats:view', description: 'Xem thống kê hệ thống' },
] as const;

// Permissions gán cho Mod
const MOD_PERMISSION_KEYS = [
  'game:manage',
  'dispute:resolve',
  'listing:moderate',
  'topup:confirm',
  'stats:view',
];

// Permissions mặc định cho USER (khi đăng ký)
const USER_DEFAULT_PERMISSION_KEYS = [
  'profile:edit',
  'order:buy',
  'order:view_own',
];

// Permissions cho SELLER
const SELLER_PERMISSION_KEYS = [
  'listing:create',
  'listing:edit',
  'listing:delete',
  'listing:pin',
  'order:deliver',
  'insurance:manage',
];

// Permissions cho BUYER (thêm vào USER permissions)
const BUYER_PERMISSION_KEYS = [
  'order:buy',
  'order:view_own',
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

  // ---- Fetch current state from DB ----
  console.log('📌 Fetching roles and permissions...');
  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);

  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r]));
  const permMap = Object.fromEntries(allPermissions.map((p) => [p.key, p.id]));

  // ---- 3. Assign permissions to Mod role ----
  console.log('📌 Assigning permissions to Mod role...');
  const modRole = roleMap['Mod'];
  if (modRole) {
    const modPermissionIds = MOD_PERMISSION_KEYS
      .map((key) => permMap[key])
      .filter((id): id is number => id !== undefined);

    if (modPermissionIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(modPermissionIds.map((permId) => ({ roleId: modRole.id, permissionId: permId })))
        .onConflictDoNothing();
      console.log(`   ✓ ${modPermissionIds.length} permissions assigned to Mod`);
    }
  } else {
    console.log('   ⚠ Mod role not found');
  }

  // ---- 4. Assign default permissions to USER role ----
  console.log('📌 Assigning default permissions to USER role...');
  const userRole = roleMap['USER'];
  if (userRole) {
    const userPermissionIds = USER_DEFAULT_PERMISSION_KEYS
      .map((key) => permMap[key])
      .filter((id): id is number => id !== undefined);

    if (userPermissionIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(userPermissionIds.map((permId) => ({ roleId: userRole.id, permissionId: permId })))
        .onConflictDoNothing();
      console.log(`   ✓ ${userPermissionIds.length} default permissions assigned to USER`);
    }
  } else {
    console.log('   ⚠ USER role not found');
  }

  // ---- 5. Assign permissions to SELLER role ----
  console.log('📌 Assigning permissions to SELLER role...');
  const sellerRole = roleMap['SELLER'];
  if (sellerRole) {
    const sellerPermissionIds = SELLER_PERMISSION_KEYS
      .map((key) => permMap[key])
      .filter((id): id is number => id !== undefined);

    if (sellerPermissionIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(sellerPermissionIds.map((permId) => ({ roleId: sellerRole.id, permissionId: permId })))
        .onConflictDoNothing();
      console.log(`   ✓ ${sellerPermissionIds.length} permissions assigned to SELLER`);
    }
  } else {
    console.log('   ⚠ SELLER role not found');
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
