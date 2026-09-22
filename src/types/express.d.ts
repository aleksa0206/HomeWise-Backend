declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        role: 'Owner' | 'Member';
        householdId: number;
      };
    }
  }
}

export {};
