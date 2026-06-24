import type { User } from '../types';

/**
 * Whether the user may create/edit finance records. Admins always can; partners
 * only when the admin has enabled it (reflected by `financeEditable` from the
 * server). Other roles don't reach finance admin screens.
 */
export function canEditFinance(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'PARTNER') return !!user.financeEditable;
  return true;
}
