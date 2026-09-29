import request from 'supertest';
import app from '../src/app';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { createTestHousehold, createTestUser } from './helpers/testFactory';

describe('Rate limiting', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('returns 429 after 10 login attempts in a short period', async () => {
    const company = await createTestHousehold();

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const { user } = await createTestUser({
        householdId: company.id,
        email: `ratelimit${i}@test.com`,
      });
      const res = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: 'pogresna-lozinka' });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});
