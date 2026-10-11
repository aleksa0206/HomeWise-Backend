import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prismaClient';
import { payBill } from '../src/repositories/billRepository';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { bearer } from './helpers/testHelpers';
import { createTestCategory, createTestHousehold, createTestUser } from './helpers/testFactory';

async function setup() {
  const household = await createTestHousehold();
  const { user: owner } = await createTestUser({
    householdId: household.id,
    role: 'Owner',
    firstName: 'Ana',
  });
  const { user: member } = await createTestUser({ householdId: household.id });
  const bills = await createTestCategory(household.id, { name: 'Bills' });
  const salary = await createTestCategory(household.id, { name: 'Salary', type: 'Income' });
  return { household, owner, member, bills, salary };
}

describe('Bills', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('creating a bill with a responsible member notifies them', async () => {
    const { owner, member, bills } = await setup();

    const res = await request(app).post('/bills').set('Authorization', bearer(owner)).send({
      name: 'Electricity',
      amount: '4500.00',
      categoryId: bills.id,
      nextDueDate: '2026-10-25',
      responsibleId: member.id,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      recurrence: 'Monthly',
      isActive: true,
      responsible: { id: member.id },
      category: { id: bills.id },
    });
    const notification = await prisma.notification.findFirst({ where: { userId: member.id } });
    expect(notification).toMatchObject({
      type: 'BillAssigned',
      message: 'Ana made you responsible for Electricity (due 2026-10-25)',
    });
  });

  it('a bill must use an expense category', async () => {
    const { owner, salary } = await setup();

    const res = await request(app).post('/bills').set('Authorization', bearer(owner)).send({
      name: 'Rent',
      amount: 1,
      categoryId: salary.id,
      nextDueDate: '2026-10-25',
    });

    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toBe('categoryId');
  });

  it('paying records an expense, advances the due date and cannot be repeated for the same period', async () => {
    const { owner, member, bills } = await setup();
    const created = await request(app).post('/bills').set('Authorization', bearer(owner)).send({
      name: 'Internet',
      amount: '2999.99',
      categoryId: bills.id,
      nextDueDate: '2026-10-31',
    });

    const paid = await request(app)
      .post(`/bills/${created.body.id}/pay`)
      .set('Authorization', bearer(member))
      .send({ date: '2026-10-30' });

    expect(paid.status).toBe(200);
    expect(paid.body.bill.nextDueDate).toBe('2026-11-30T00:00:00.000Z');
    expect(paid.body.bill.lastPaidAt).not.toBeNull();
    expect(paid.body.transaction).toMatchObject({
      amount: '2999.99',
      note: 'Internet',
      date: '2026-10-30T00:00:00.000Z',
      user: { id: member.id },
      category: { id: bills.id },
    });

    // A second click with the stale state the client had.
    const stale = await payBill({
      billId: created.body.id,
      expectedDueDate: new Date('2026-10-31'),
      nextDueDate: new Date('2026-11-30'),
      transaction: {
        householdId: created.body.householdId,
        categoryId: bills.id,
        userId: member.id,
        amount: '1',
        date: new Date('2026-10-30'),
        note: 'x',
      },
    });
    expect(stale).toBeNull();
    expect(await prisma.transaction.count()).toBe(1);
  });

  it('a one-off bill becomes inactive once paid', async () => {
    const { owner, bills } = await setup();
    const created = await request(app).post('/bills').set('Authorization', bearer(owner)).send({
      name: 'Car registration',
      amount: 12000,
      categoryId: bills.id,
      recurrence: 'None',
      nextDueDate: '2026-11-15',
    });

    const paid = await request(app)
      .post(`/bills/${created.body.id}/pay`)
      .set('Authorization', bearer(owner))
      .send({ amount: 11800 });
    const again = await request(app)
      .post(`/bills/${created.body.id}/pay`)
      .set('Authorization', bearer(owner))
      .send({});

    expect(paid.body.bill.isActive).toBe(false);
    expect(paid.body.transaction.amount).toBe('11800');
    expect(again.status).toBe(409);
  });

  it('GET /bills?dueTo lists active bills due by that date, including overdue, soonest first', async () => {
    const { household, owner, bills } = await setup();
    for (const [name, nextDueDate, isActive] of [
      ['Late', '2026-10-01', true],
      ['Soon', '2026-10-20', true],
      ['Later', '2026-12-01', true],
      ['Old', '2026-10-05', false],
    ] as const) {
      await prisma.bill.create({
        data: {
          householdId: household.id,
          categoryId: bills.id,
          name,
          amount: '10',
          nextDueDate: new Date(nextDueDate),
          isActive,
        },
      });
    }

    const res = await request(app)
      .get('/bills?isActive=true&dueTo=2026-10-31')
      .set('Authorization', bearer(owner));

    expect(res.body.data.map((b: { name: string }) => b.name)).toEqual(['Late', 'Soon']);
  });

  it("another household's bill cannot be read or paid", async () => {
    const { owner } = await setup();
    const other = await createTestHousehold('Other');
    const otherCategory = await createTestCategory(other.id);
    const bill = await prisma.bill.create({
      data: {
        householdId: other.id,
        categoryId: otherCategory.id,
        name: 'Theirs',
        amount: '1',
        nextDueDate: new Date('2026-10-20'),
      },
    });

    const get = await request(app).get(`/bills/${bill.id}`).set('Authorization', bearer(owner));
    const pay = await request(app)
      .post(`/bills/${bill.id}/pay`)
      .set('Authorization', bearer(owner))
      .send({});

    expect([get.status, pay.status]).toEqual([403, 403]);
  });
});
