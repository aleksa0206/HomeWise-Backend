import request from 'supertest';
import app from '../src/app';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { bearer } from './helpers/testHelpers';
import { createTestCategory, createTestHousehold, createTestUser } from './helpers/testFactory';

describe('Zod validation - rejects bad input', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  async function setup() {
    const household = await createTestHousehold();
    const { user: owner } = await createTestUser({ householdId: household.id, role: 'Owner' });
    const category = await createTestCategory(household.id);
    return { household, owner, category };
  }

  it('rejects creating a member with an invalid email', async () => {
    const { owner } = await setup();

    const res = await request(app).post('/users').set('Authorization', bearer(owner)).send({
      firstName: 'Test',
      lastName: 'User',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toBe('email');
  });

  it('rejects a transaction with a negative amount or more than 2 decimals', async () => {
    const { owner, category } = await setup();

    for (const amount of [-5, '0', '10.555', 'abc']) {
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', bearer(owner))
        .send({ categoryId: category.id, amount, date: '2026-10-01' });
      expect(res.status).toBe(400);
    }
  });

  it('accepts a numeric or string amount and stores it exactly', async () => {
    const { owner, category } = await setup();

    const res = await request(app)
      .post('/transactions')
      .set('Authorization', bearer(owner))
      .send({ categoryId: category.id, amount: '1234.50', date: '2026-10-01' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe('1234.5');
  });

  it('rejects a chore without a title and a malformed due date', async () => {
    const { owner } = await setup();

    const res = await request(app)
      .post('/chores')
      .set('Authorization', bearer(owner))
      .send({ dueDate: '10/01/2026' });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual([
      'dueDate',
      'title',
    ]);
  });

  it('rejects a budget summary without a valid month', async () => {
    const { owner } = await setup();

    const res = await request(app)
      .get('/budgets/summary?year=2026&month=13')
      .set('Authorization', bearer(owner));

    expect(res.status).toBe(400);
  });
});
