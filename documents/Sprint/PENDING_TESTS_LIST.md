# Danh Sách Tests Chưa Hoàn Thành - Sprint 6
## GIAODICHGAME C2C Marketplace

> **Ngày tạo:** 2026-03-15  
> **Tổng số tests chưa hoàn thành:** 48/145  
> **Status:** 🔄 IN PROGRESS

---

## 📊 Tổng Quan

| Module | Total Tests | Passing | Failing | Pass Rate | Priority |
|--------|-------------|---------|---------|-----------|----------|
| **Admin** | 18 | 3 | **15** | 17% | 🔴 High |
| **Disputes** | 25 | 11 | **14** | 44% | 🔴 High |
| **Listings** | 16 | 10 | **6** | 62% | 🟡 Medium |
| **Pin** | 15 | 11 | **4** | 73% | 🟡 Medium |
| **VIP** | 16 | 14 | **2** | 87% | 🟢 Low |
| **Games** | 14 | 12 | **2** | 86% | 🟢 Low |
| **Total** | **145** | **97** | **48** | **67%** | - |

---

## 🔴 HIGH PRIORITY (29 tests)

### 1. Admin Service - 15 tests ❌

**File:** `apps/api/src/admin/admin.service.spec.ts`

#### getStats() - 2 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| ADM-001 | should return system stats successfully | Mock chain broken | Fix `db.select().from().where()` chain |
| ADM-002 | should return 0 when no data | Mock chain broken | Fix `db.select().from().where()` chain |

#### getUsers() - 3 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| ADM-003 | should return paginated list of users | Mock chain broken | Fix `db.select().from().where().orderBy().limit().offset()` chain |
| ADM-004 | should search users by email | Mock chain broken | Fix `db.select().from().where()` with search |
| ADM-005 | should filter users by active status | Mock chain broken | Fix `db.select().from().where()` with filter |

#### getUserById() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| ADM-006 | should return user by ID | Mock chain broken | Fix `db.select().from().innerJoin()` chain |

#### banUser() - 2 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| ADM-008 | should ban user successfully | Result undefined | Fix mock return value |
| ADM-009 | should throw NotFoundException when user not found | Promise resolved instead of rejected | Fix mock implementation |

#### unbanUser() - 2 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| ADM-010 | should unban user successfully | Result undefined | Fix mock return value |
| ADM-011 | should throw NotFoundException when user not found | Promise resolved instead of rejected | Fix mock implementation |

#### User Roles - 4 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| ADM-012 | should return user roles | Method exists but mock broken | Fix `db.query.userRoles.findMany()` mock |
| ADM-013 | should assign role to user successfully | Method exists but mock broken | Fix `db.insert().values().returning()` chain |
| ADM-014 | should throw NotFoundException when user not found | Method exists but mock broken | Fix mock to throw exception |
| ADM-015 | should remove role from user successfully | Method exists but mock broken | Fix `db.delete().where()` chain |

#### Topup Management - 2 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| ADM-016 | should return pending topup requests | Method exists but mock broken | Fix `db.query.topupRequests.findMany()` mock |
| ADM-017 | should confirm topup request successfully | Method exists but mock broken | Fix `db.transaction()` mock |

---

### 2. Disputes Service - 14 tests ❌

**File:** `apps/api/src/disputes/disputes.service.spec.ts`

#### createDispute() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-001 | should create dispute successfully | `innerJoin` not a function | Implement `innerJoin` in mock chain |

#### getDisputes() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-007 | should return list of disputes for user | `disputes.map` is not a function | Fix mock return value to be array |

#### getDisputeById() - 3 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-008 | should return dispute details | Extra fields in result | Update test expectation |
| DSP-009 | should throw NotFoundException when dispute not found | Mock implementation | Fix mock to throw exception |
| DSP-010 | should throw ForbiddenException when user has no access | Mock implementation | Fix mock to throw exception |

#### sendMessage() - 3 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-011 | should send message successfully | Message mismatch | Fix test data: "Test message" vs "This is a test message" |
| DSP-012 | should throw NotFoundException when dispute not found | Mock implementation | Fix mock to throw exception |
| DSP-013 | should throw ForbiddenException when user not involved | Mock implementation | Fix mock to throw exception |

#### withdrawDispute() - 3 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-014 | should withdraw dispute successfully | Result status undefined | Fix mock return value |
| DSP-015 | should throw NotFoundException when dispute not found | Mock implementation | Fix mock to throw exception |
| DSP-016 | should throw ForbiddenException when not buyer | Mock implementation | Fix mock to throw exception |

#### resolveDispute() - 3 tests ⚠️ **METHOD MISSING**
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-017 | should resolve dispute with REFUND | **Method does not exist** | **Implement `resolveDispute()` in service** |
| DSP-018 | should resolve dispute with RELEASE | **Method does not exist** | **Implement `resolveDispute()` in service** |
| DSP-019 | should throw NotFoundException when dispute not found | **Method does not exist** | **Implement `resolveDispute()` in service** |

#### handleAutoRefund() - 2 tests ⚠️ **METHOD MISSING**
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-020 | should auto refund when seller did not respond | **Method does not exist** | **Implement `handleAutoRefund()` in service** |
| DSP-021 | should skip auto refund if seller responded | **Method does not exist** | **Implement `handleAutoRefund()` in service** |

#### updateSettings() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-023 | should update dispute settings | `onConflictDoUpdate` not a function | Fix mock chain to include `onConflictDoUpdate` |

#### uploadEvidence() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| DSP-025 | should throw BadRequestException when max files reached | Promise resolved instead of rejected | Fix test assertion logic |

---

## 🟡 MEDIUM PRIORITY (10 tests)

### 3. Listings Service - 6 tests ⚠️

**File:** `apps/api/src/listings/listings.service.spec.ts`

#### createListing() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| LST-001 | should create listing successfully | Mock return issue | Fix mock data to return listing |

#### getListingById() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| LST-007 | should return listing by ID | `$dynamic` not a function | Add `$dynamic` to mock chain |

#### updateListing() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| LST-009 | should update listing successfully | Type mismatch | Fix assertion: use `toEqual()` instead of `toBe()` |

#### deleteListing() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| LST-012 | should delete listing successfully | `db.delete` not called | Fix mock verification |

#### incrementViewCount() - 1 test ⚠️ **METHOD MISSING**
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| LST-015 | should increment view count | **Method does not exist** | **Implement `incrementViewCount()` in service** |

#### getMyListings() - 1 test ⚠️ **METHOD MISSING**
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| LST-016 | should return user listings | **Method does not exist** | **Implement `getMyListings()` in service** |

---

### 4. Pin Service - 4 tests ⚠️

**File:** `apps/api/src/pin/pin.service.spec.ts`

#### updateConfig() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| PIN-003 | should update pin config successfully | Type mismatch | Fix assertion: string vs number |

#### calculatePrice() - 2 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| PIN-005 | should calculate price correctly | `getUserVip` call undefined query | Fix mock chain for VIP query |
| PIN-006 | should calculate price with VIP discount | `getUserVip` call undefined query | Fix mock chain for VIP query |

#### purchasePin() - 1 test
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| PIN-007 | should purchase pin successfully | `db.transaction` not a function | Add `transaction` to mock |

#### handlePinExpiry() - 1 test ⚠️ **METHOD MISSING**
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| PIN-013 | should handle pin expiry and send notification | **Method does not exist** | **Implement `handleExpiry()` in service** |

#### getPinDiscount() - 2 tests ⚠️ **METHOD MISSING**
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| PIN-014 | should return 0 discount for non-VIP user | **Method does not exist** | **Implement `getDiscount()` in service** |
| PIN-015 | should return discount for VIP user | **Method does not exist** | **Implement `getDiscount()` in service** |

---

## 🟢 LOW PRIORITY (6 tests)

### 5. VIP Service - 2 tests ⚠️

**File:** `apps/api/src/vip/vip.service.spec.ts`

#### purchaseVip() - 2 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| VIP-008 | should purchase VIP successfully | `db.transaction` not a function | Add `transaction` to mock |
| VIP-010 | should throw BadRequestException when user already has active VIP | Wrong exception type | Fix test assertion |

---

### 6. Games Service - 2 tests ⚠️

**File:** `apps/api/src/games/games.service.spec.ts`

#### deleteGame() - 2 tests
| Test ID | Test Name | Issue | Fix Required |
|---------|-----------|-------|--------------|
| GME-013 | should delete game successfully | `db.delete` not called | Fix mock verification |
| GME-014 | should throw NotFoundException when game not found | Promise resolved instead of rejected | Fix mock implementation |

---

## 📋 Summary by Issue Type

### Missing Methods (10 tests)

| Service | Method | Tests Affected | Priority |
|---------|--------|----------------|----------|
| **Disputes** | `resolveDispute()` | 3 | 🔴 High |
| **Disputes** | `handleAutoRefund()` | 2 | 🔴 High |
| **Listings** | `incrementViewCount()` | 1 | 🟡 Medium |
| **Listings** | `getMyListings()` | 1 | 🟡 Medium |
| **Pin** | `handleExpiry()` | 1 | 🟡 Medium |
| **Pin** | `getDiscount()` | 2 | 🟡 Medium |

### Mock Chain Issues (29 tests)

| Service | Issue | Tests Affected | Priority |
|---------|-------|----------------|----------|
| **Admin** | `select().from().where()` chain | 5 | 🔴 High |
| **Admin** | `select().from().innerJoin()` chain | 1 | 🔴 High |
| **Admin** | `transaction` mock | 1 | 🔴 High |
| **Disputes** | `innerJoin` mock | 1 | 🔴 High |
| **Disputes** | `onConflictDoUpdate` mock | 1 | 🔴 High |
| **Listings** | `$dynamic` mock | 1 | 🟡 Medium |
| **Pin** | `transaction` mock | 1 | 🟡 Medium |
| **VIP** | `transaction` mock | 1 | 🟢 Low |

### Test Assertion Issues (9 tests)

| Service | Issue | Tests Affected | Priority |
|---------|-------|----------------|----------|
| **Admin** | Result undefined | 4 | 🔴 High |
| **Disputes** | Extra fields in result | 1 | 🔴 High |
| **Disputes** | Message mismatch | 1 | 🔴 High |
| **Disputes** | Test logic issue | 1 | 🔴 High |
| **Listings** | Type mismatch | 1 | 🟡 Medium |
| **Pin** | Type mismatch | 1 | 🟡 Medium |
| **VIP** | Wrong exception type | 1 | 🟢 Low |
| **Games** | Mock verification | 2 | 🟢 Low |

---

## 🎯 Action Plan

### Phase 1: Fix High Priority (5-7 hours)

1. **Admin Service** (2-3h)
   - Fix mock chains for `getStats()`, `getUsers()`, `getUserById()`
   - Add `transaction` mock for `confirmTopup()`
   - Fix mock return values for ban/unban

2. **Disputes Service** (3-4h)
   - Implement `resolveDispute()` method
   - Implement `handleAutoRefund()` method
   - Fix mock chains for `innerJoin`, `onConflictDoUpdate`
   - Fix test data mismatches

### Phase 2: Fix Medium Priority (3-4 hours)

3. **Listings Service** (1-2h)
   - Implement `incrementViewCount()` method
   - Implement `getMyListings()` method
   - Fix mock chains

4. **Pin Service** (1-2h)
   - Implement `handleExpiry()` method
   - Implement `getDiscount()` method
   - Fix `transaction` mock
   - Fix type assertions

### Phase 3: Fix Low Priority (1 hour)

5. **VIP Service** (30min)
   - Fix `transaction` mock
   - Fix error case assertions

6. **Games Service** (15min)
   - Fix mock verification

---

## 📊 Estimated Time

| Priority | Tests | Estimated Time |
|----------|-------|----------------|
| 🔴 High | 29 | 5-7 hours |
| 🟡 Medium | 10 | 3-4 hours |
| 🟢 Low | 6 | 1 hour |
| **Total** | **48** | **9-12 hours** |

---

**Created:** 2026-03-15  
**Last Updated:** 2026-03-15  
**Next Review:** After Phase 1 completion  
**Target Completion:** 2026-03-17
