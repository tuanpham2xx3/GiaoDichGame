/**
 * Seed script – chạy một lần để tạo dữ liệu ban đầu:
 *   - Roles: USER (system), ADMIN (system), Mod, SELLER, BUYER
 *   - Permissions: 20 permissions hệ thống
 *   - Role assignments: gán permissions cho role Mod, USER
 *   - Sample Games với schema
 *   - Sample Listings
 *
 * Usage: npm run db:seed (trong apps/api)
 */

// @ts-nocheck

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'giaodichgame',
  username: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASS ?? 'apppassword',
});

const db = drizzle(client, { schema });

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

// Sample Games với schema
const SAMPLE_GAMES = [
  {
    name: 'Liên Quân Mobile',
    slug: 'lien-quan',
    iconUrl: 'https://cdn.giaodichgame.vn/games/lien-quan.png',
    schema: [
      { field: 'rank', label: 'Rank', type: 'select' as const, required: true, options: ['Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Kim Cương', 'Cao Thủ', 'Thách Đấu'] },
      { field: 'server', label: 'Server', type: 'select' as const, required: true, options: ['VN', 'Taiwan', 'Thai'] },
      { field: 'champions', label: 'Tướng', type: 'number' as const, required: false },
      { field: 'skins', label: 'Trang phục', type: 'number' as const, required: false },
    ],
  },
  {
    name: 'Free Fire',
    slug: 'free-fire',
    iconUrl: 'https://cdn.giaodichgame.vn/games/free-fire.png',
    schema: [
      { field: 'rank', label: 'Rank', type: 'select' as const, required: true, options: ['Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Kim Cương', 'Ace', 'Grandmaster'] },
      { field: 'characters', label: 'Nhân vật', type: 'number' as const, required: false },
      { field: 'pets', label: 'Thú cưng', type: 'number' as const, required: false },
      { field: 'diamonds', label: 'Kim cương', type: 'number' as const, required: false },
    ],
  },
  {
    name: 'Liên Minh Huyền Thoại',
    slug: 'lmht',
    iconUrl: 'https://cdn.giaodichgame.vn/games/lmht.png',
    schema: [
      { field: 'rank', label: 'Rank', type: 'select' as const, required: true, options: ['Sắt', 'Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Kim Cương', 'Cao Thủ', 'Thách Đấu'] },
      { field: 'server', label: 'Server', type: 'select' as const, required: true, options: ['Hồng Lam', 'Liên Minh', 'Vietnam'] },
      { field: 'champions', label: 'Tướng', type: 'number' as const, required: false },
      { field: 'skins', label: 'Trang phục', type: 'number' as const, required: false },
    ],
  },
  {
    name: 'Valorant',
    slug: 'valorant',
    iconUrl: 'https://cdn.giaodichgame.vn/games/valorant.png',
    schema: [
      { field: 'rank', label: 'Rank', type: 'select' as const, required: true, options: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'] },
      { field: 'agents', label: 'Đặc vụ', type: 'number' as const, required: false },
      { field: 'battlepass', label: 'Battle Pass', type: 'select' as const, required: false, options: ['Có', 'Không'] },
    ],
  },
  {
    name: 'Genshin Impact',
    slug: 'genshin-impact',
    iconUrl: 'https://cdn.giaodichgame.vn/games/genshin.png',
    schema: [
      { field: 'adventure_rank', label: 'Adventure Rank', type: 'number' as const, required: true },
      { field: 'characters', label: 'Nhân vật', type: 'number' as const, required: false },
      { field: 'weapons', label: 'Vũ khí', type: 'number' as const, required: false },
      { field: 'primogems', label: 'Nguyện Cầu', type: 'number' as const, required: false },
    ],
  },
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

  // ---- 6. Insert Sample Games ----
  console.log('📌 Inserting sample games...');
  const insertedGames = await db
    .insert(games)
    .values(SAMPLE_GAMES.map((g) => ({ ...g })))
    .onConflictDoNothing({ target: games.slug })
    .returning();

  console.log(`   ✓ ${insertedGames.length} games inserted (or already exist)`);

  // ---- 7. Create sample user for testing ----
  console.log('📌 Creating sample seller user...');
  const existingUserArray = await db.select().from(schema.users).where(
    require('drizzle-orm').eq(schema.users.email, 'seller@giaodichgame.test')
  );
  const existingUser = existingUserArray[0];

  let sellerUserId = existingUser?.id;

  if (!sellerUserId) {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('seller123', 12);
    const [sellerUser] = await db
      .insert(schema.users)
      .values({
        email: 'seller@giaodichgame.test',
        passwordHash: hashedPassword,
        username: 'SellerTest',
        isActive: true,
      })
      .returning();
    sellerUserId = sellerUser.id;
    console.log(`   ✓ Sample seller user created (id: ${sellerUserId})`);

    // Assign SELLER role
    if (sellerRole) {
      await db
        .insert(userRoles)
        .values({ userId: sellerUserId, roleId: sellerRole.id })
        .onConflictDoNothing();
      console.log(`   ✓ SELLER role assigned to user`);
    }
  } else {
    console.log(`   ✓ Seller user already exists (id: ${sellerUserId})`);
  }

  // ---- 8. Insert Sample Listings ----
  if (sellerUserId && insertedGames.length > 0) {
    console.log('📌 Inserting sample listings...');

    const sampleListings = [
      {
        sellerId: sellerUserId,
        gameId: insertedGames[0].id,
        title: 'Bán acc Liên Quân Rank Vàng - 50 tướng',
        description: 'Acc Liên Quân rank Vàng, có 50 tướng, nhiều trang phục hiếm. Login qua Garena.',
        price: '500000',
        gameAttributes: { rank: 'Vàng', server: 'VN', champions: 50, skins: 15 },
        status: 'PUBLISHED',
      },
      {
        sellerId: sellerUserId,
        gameId: insertedGames[0].id,
        title: 'Acc Liên Quân Kim Cương - Acc mới',
        description: 'Acc Liên Quân mới tạo, rank Kim Cương, có 30 tướng free.',
        price: '350000',
        gameAttributes: { rank: 'Kim Cương', server: 'VN', champions: 30, skins: 5 },
        status: 'PUBLISHED',
      },
      {
        sellerId: sellerUserId,
        gameId: insertedGames[1].id,
        title: 'Bán acc Free Fire Kim Cương',
        description: 'Acc Free Fire rank Kim Cương, có 5 nhân vật, 3 thú cưng.',
        price: '450000',
        gameAttributes: { rank: 'Kim Cương', characters: 5, pets: 3 },
        status: 'PUBLISHED',
      },
      {
        sellerId: sellerUserId,
        gameId: insertedGames[2].id,
        title: 'Acc LMHT rank Bạch Kim - Server Hồng Lam',
        description: 'Acc LMHT rank Bạch Kim, 150 tướng, nhiều trang phục.',
        price: '800000',
        gameAttributes: { rank: 'Bạch Kim', server: 'Hồng Lam', champions: 150, skins: 40 },
        status: 'PUBLISHED',
      },
      {
        sellerId: sellerUserId,
        gameId: insertedGames[3].id,
        title: 'Acc Valorant Radiant - Full agents',
        description: 'Acc Valorant rank Radiant, full đặc vụ, nhiều skin.',
        price: '1200000',
        gameAttributes: { rank: 'Radiant', agents: 25, battlepass: 'Có' },
        status: 'PUBLISHED',
      },
      {
        sellerId: sellerUserId,
        gameId: insertedGames[4].id,
        title: 'Acc Genshin AR60 - Full characters',
        description: 'Acc Genshin AR60, có tất cả nhân vật, nhiều vũ khí 5 sao.',
        price: '3000000',
        gameAttributes: { adventure_rank: 60, characters: 50, weapons: 30, primogems: 10000 },
        status: 'PUBLISHED',
      },
    ];

    await db
      .insert(listings)
      .values(sampleListings)
      .onConflictDoNothing();

    console.log(`   ✓ ${sampleListings.length} sample listings inserted`);
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
