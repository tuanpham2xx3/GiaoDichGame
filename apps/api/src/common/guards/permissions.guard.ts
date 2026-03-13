import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { DRIZZLE } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { RequestUser } from '../decorators/current-user.decorator';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(DRIZZLE) private db: Db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission requirement → pass
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Unauthorized');

    // Admin system role bypass
    const adminRole = await this.db
      .select()
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(
        and(
          eq(schema.userRoles.userId, user.userId),
          eq(schema.roles.name, 'ADMIN'),
          eq(schema.roles.isSystem, true),
        ),
      )
      .limit(1);

    if (adminRole.length > 0) return true;

    // Get user permissions via roles
    const userRoleRows = await this.db
      .select({ roleId: schema.userRoles.roleId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.userId));

    if (userRoleRows.length === 0) throw new ForbiddenException('No roles assigned');

    const roleIds = userRoleRows.map((r) => r.roleId);

    const permRows = await this.db
      .select({ key: schema.permissions.key })
      .from(schema.rolePermissions)
      .innerJoin(
        schema.permissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .where(inArray(schema.rolePermissions.roleId, roleIds));

    const userPerms = new Set(permRows.map((p) => p.key));

    const hasAll = requiredPermissions.every((p) => userPerms.has(p));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
