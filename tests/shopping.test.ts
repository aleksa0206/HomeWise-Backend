import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prismaClient';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { bearer } from './helpers/testHelpers';
import { createTestHousehold, createTestUser } from './helpers/testFactory';

async function setup() {
  const household = await createTestHousehold();
  const { user: owner } = await createTestUser({ householdId: household.id, role: 'Owner' });
  const { user: marko } = await createTestUser({ householdId: household.id });
  const { user: jelena } = await createTestUser({ householdId: household.id });
  return { household, owner, marko, jelena };
}

describe('Shopping lists', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('members share a list: anyone adds and checks items, and the server records who', async () => {
    const { marko, jelena } = await setup();
    const list = await request(app)
      .post('/shopping-lists')
      .set('Authorization', bearer(marko))
      .send({ name: 'Groceries' });
    const milk = await request(app)
      .post(`/shopping-lists/${list.body.id}/items`)
      .set('Authorization', bearer(marko))
      .send({ name: 'Milk', quantity: '2 l' });
    await request(app)
      .post(`/shopping-lists/${list.body.id}/items`)
      .set('Authorization', bearer(jelena))
      .send({ name: 'Bread' });

    const checked = await request(app)
      .put(`/shopping-items/${milk.body.id}`)
      .set('Authorization', bearer(jelena))
      .send({ isChecked: true });
    const items = await request(app)
      .get(`/shopping-lists/${list.body.id}/items`)
      .set('Authorization', bearer(marko));
    const lists = await request(app).get('/shopping-lists').set('Authorization', bearer(marko));

    expect(checked.body).toMatchObject({ isChecked: true, checkedBy: { id: jelena.id } });
    // Unchecked items first.
    expect(items.body.data.map((i: { name: string }) => i.name)).toEqual(['Bread', 'Milk']);
    expect(lists.body.data[0]._count.items).toBe(1);

    const unchecked = await request(app)
      .put(`/shopping-items/${milk.body.id}`)
      .set('Authorization', bearer(marko))
      .send({ isChecked: false });
    expect(unchecked.body.checkedById).toBeNull();
  });

  it('clear-checked removes only checked items', async () => {
    const { household, marko } = await setup();
    const list = await prisma.shoppingList.create({
      data: { householdId: household.id, createdById: marko.id, name: 'Weekend' },
    });
    for (const [name, isChecked] of [
      ['Eggs', true],
      ['Rice', false],
      ['Soap', true],
    ] as const) {
      await prisma.shoppingItem.create({
        data: { listId: list.id, householdId: household.id, addedById: marko.id, name, isChecked },
      });
    }

    const res = await request(app)
      .post(`/shopping-lists/${list.id}/clear-checked`)
      .set('Authorization', bearer(marko));

    expect(res.body).toEqual({ removed: 2 });
    expect((await prisma.shoppingItem.findMany()).map((i) => i.name)).toEqual(['Rice']);
  });

  it('only the creator or an Owner deletes a list, and its items go with it', async () => {
    const { household, owner, marko, jelena } = await setup();
    const list = await prisma.shoppingList.create({
      data: { householdId: household.id, createdById: marko.id, name: 'Party' },
    });
    await prisma.shoppingItem.create({
      data: { listId: list.id, householdId: household.id, addedById: marko.id, name: 'Chips' },
    });

    const byOther = await request(app)
      .delete(`/shopping-lists/${list.id}`)
      .set('Authorization', bearer(jelena));
    const byOwner = await request(app)
      .delete(`/shopping-lists/${list.id}`)
      .set('Authorization', bearer(owner));

    expect(byOther.status).toBe(403);
    expect(byOwner.status).toBe(200);
    expect(await prisma.shoppingItem.count()).toBe(0);
  });

  it("another household's list and items are forbidden", async () => {
    const { marko } = await setup();
    const other = await createTestHousehold('Other');
    const { user: stranger } = await createTestUser({ householdId: other.id });
    const list = await prisma.shoppingList.create({
      data: { householdId: other.id, createdById: stranger.id, name: 'Theirs' },
    });
    const item = await prisma.shoppingItem.create({
      data: { listId: list.id, householdId: other.id, addedById: stranger.id, name: 'X' },
    });

    const add = await request(app)
      .post(`/shopping-lists/${list.id}/items`)
      .set('Authorization', bearer(marko))
      .send({ name: 'Y' });
    const check = await request(app)
      .put(`/shopping-items/${item.id}`)
      .set('Authorization', bearer(marko))
      .send({ isChecked: true });
    const lists = await request(app).get('/shopping-lists').set('Authorization', bearer(marko));

    expect([add.status, check.status]).toEqual([403, 403]);
    expect(lists.body.meta.total).toBe(0);
  });
});
