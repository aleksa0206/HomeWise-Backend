import jwt from 'jsonwebtoken';

export function tokenFor(user: { id: number; role: string; householdId: number }) {
  return jwt.sign(
    { userId: user.id, role: user.role, householdId: user.householdId },
    process.env.JWT_SECRET as string,
    { expiresIn: '15m' }
  );
}

export function bearer(user: { id: number; role: string; householdId: number }) {
  return `Bearer ${tokenFor(user)}`;
}
