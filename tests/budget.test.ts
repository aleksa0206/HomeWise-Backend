import request from 'supertest';
import app from '../src/app';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { bearer } from './helpers/testHelpers';
import {
  createTestCategory,
  createTestHousehold,
  createTestTransaction,
  createTestUser,
} from './helpers/testFactory';

async function setup() {
  const household = await createTestHousehold();
  const { user: owner } = await createTestUser({ householdId: household.id, role: 'Owner' });
  const { user: member } = await createTestUser({ householdId: household.id });
  const groceries = await createTestCategory(household.id, { name: 'Groceries' });
  const salary = await createTestCategory(household.id, { name: 'Salary', type: 'Income' });
  return { household, owner, member, groceries, salary };
}

describe('Budget, categories and transactions', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('summary shows planned vs actual per category for the month only', async () => {
    const { household, member, groceries, salary } = await setup();
    await request(app)
      .put('/budgets')
      .set('Authorization', bearer(member))
      .send({ categoryId: groceries.id, year: 2026, month: 10, amount: 30000 });
    await createTestTransaction({
      householdId: household.id,
      categoryId: groceries.id,
      userId: member.id,
      amount: '1200.50',
      date: new Date('2026-10-01'),
    });
    await createTestTransaction({
      householdId: household.id,
      categoryId: groceries.id,
      userId: member.id,
      amount: '800.25',
      date: new Date('2026-10-31'),
    });
    // Outside the month: must not count.
    await createTestTransaction({
      householdId: household.id,
      categoryId: groceries.id,
      userId: member.id,
      amount: '999.00',
      date: new Date('2026-11-01'),
    });
    await createTestTransaction({
      householdId: household.id,
      categoryId: salary.id,
      userId: member.id,
      amount: '100000.00',
      date: new Date('2026-10-05'),
    });

    const res = await request(app)
      .get('/budgets/summary?year=2026&month=10')
      .set('Authorization', bearer(member));

    expect(res.status).toBe(200);
    expect(res.body.expense).toEqual({ planned: '30000.00', actual: '2000.75' });
    expect(res.body.income).toEqual({ planned: '0.00', actual: '100000.00' });
    expect(res.body.balance).toBe('97999.25');
    expect(res.body.categories.find((c: any) => c.categoryId === groceries.id)).toMatchObject({
      planned: '30000.00',
      actual: '2000.75',
      budgetId: expect.any(Number),
    });
  });

  it('PUT /budgets updates the existing plan instead of creating a duplicate', async () => {
    const { member, groceries } = await setup();
    const body = { categoryId: groceries.id, year: 2026, month: 10 };

    const first = await request(app)
      .put('/budgets')
      .set('Authorization', bearer(member))
      .send({ ...body, amount: 100 });
    const second = await request(app)
      .put('/budgets')
      .set('Authorization', bearer(member))
      .send({ ...body, amount: '250.00' });

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.amount).toBe('250');
  });

  it("cannot budget or record a transaction on another household's category", async () => {
    const { member } = await setup();
    const other = await createTestHousehold('Other');
    const foreignCategory = await createTestCategory(other.id);

    const budget = await request(app)
      .put('/budgets')
      .set('Authorization', bearer(member))
      .send({ categoryId: foreignCategory.id, year: 2026, month: 10, amount: 1 });
    const transaction = await request(app)
      .post('/transactions')
      .set('Authorization', bearer(member))
      .send({ categoryId: foreignCategory.id, amount: 1, date: '2026-10-01' });

    expect([budget.status, transaction.status]).toEqual([403, 403]);
  });

  it('a member edits only their own transactions; the Owner can edit anyone', async () => {
    const { household, owner, member, groceries } = await setup();
    const { user: sibling } = await createTestUser({ householdId: household.id });
    const transaction = await createTestTransaction({
      householdId: household.id,
      categoryId: groceries.id,
      userId: sibling.id,
    });

    const byMember = await request(app)
      .put(`/transactions/${transaction.id}`)
      .set('Authorization', bearer(member))
      .send({ amount: 1 });
    const byOwner = await request(app)
      .put(`/transactions/${transaction.id}`)
      .set('Authorization', bearer(owner))
      .send({ amount: 5, note: 'fixed' });

    expect(byMember.status).toBe(403);
    expect(byOwner.status).toBe(200);
    expect(byOwner.body).toMatchObject({ amount: '5', note: 'fixed' });
  });

  it('a transaction can be recorded for another member, defaulting to myself', async () => {
    const { owner, member, groceries } = await setup();

    const mine = await request(app)
      .post('/transactions')
      .set('Authorization', bearer(member))
      .send({ categoryId: groceries.id, amount: 10, date: '2026-10-02' });
    const forOwner = await request(app)
      .post('/transactions')
      .set('Authorization', bearer(member))
      .send({ categoryId: groceries.id, amount: 10, date: '2026-10-02', userId: owner.id });

    expect(mine.body.user.id).toBe(member.id);
    expect(forOwner.body.user.id).toBe(owner.id);
  });

  it('GET /transactions filters by date range and type, newest first', async () => {
    const { household, member, groceries, salary } = await setup();
    for (const [categoryId, date] of [
      [groceries.id, '2026-09-30'],
      [groceries.id, '2026-10-03'],
      [groceries.id, '2026-10-20'],
      [salary.id, '2026-10-10'],
    ] as const) {
      await createTestTransaction({
        householdId: household.id,
        categoryId,
        userId: member.id,
        date: new Date(date),
      });
    }

    const res = await request(app)
      .get('/transactions?from=2026-10-01&to=2026-10-31&type=Expense')
      .set('Authorization', bearer(member));

    expect(res.body.data.map((t: { date: string }) => t.date.slice(0, 10))).toEqual([
      '2026-10-20',
      '2026-10-03',
    ]);
  });

  it('a category in use cannot be deleted (409); an unused one can', async () => {
    const { household, member, groceries } = await setup();
    await createTestTransaction({
      householdId: household.id,
      categoryId: groceries.id,
      userId: member.id,
    });
    const unused = await createTestCategory(household.id);

    const inUse = await request(app)
      .delete(`/categories/${groceries.id}`)
      .set('Authorization', bearer(member));
    const free = await request(app)
      .delete(`/categories/${unused.id}`)
      .set('Authorization', bearer(member));

    expect(inUse.status).toBe(409);
    expect(free.status).toBe(200);
  });

  it('duplicate category names in one household return 409', async () => {
    const { member } = await setup();

    const res = await request(app)
      .post('/categories')
      .set('Authorization', bearer(member))
      .send({ name: 'Groceries', type: 'Expense' });

    expect(res.status).toBe(409);
  });
});
