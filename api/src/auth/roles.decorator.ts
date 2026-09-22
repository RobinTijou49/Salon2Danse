import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Usage : @Roles('ADMIN') sur un contrôleur ou une route.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
