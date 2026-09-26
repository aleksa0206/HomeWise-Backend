import * as auditLogRepository from '../repositories/auditLogRepository';

export async function getAllAuditLogs(
  householdId: number,
  pagination: { skip: number; take: number }
) {
  return await auditLogRepository.findAllAuditLogs(householdId, pagination);
}
