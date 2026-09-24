import * as householdRepository from '../repositories/householdRepository';
import * as auditLogRepository from '../repositories/auditLogRepository';
import { NotFoundError } from '../errors/NotFoundError';

export async function getOwnHousehold(householdId: number) {
  const household = await householdRepository.findHouseholdById(householdId);
  if (!household) {
    throw new NotFoundError('Household');
  }
  return household;
}

export async function updateOwnHousehold(
  householdId: number,
  data: { name?: string; currency?: string },
  performedById: number
) {
  const existing = await getOwnHousehold(householdId);
  const updated = await householdRepository.updateHousehold(householdId, data);

  if (data.name !== undefined && data.name !== existing.name) {
    await auditLogRepository.createAuditLog({
      performedById,
      entityId: householdId,
      entityType: 'Household',
      action: 'UPDATE_HOUSEHOLD_NAME',
      oldValue: existing.name,
      newValue: data.name,
      householdId,
    });
  }

  return updated;
}
