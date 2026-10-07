import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prismaClient';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { bearer } from './helpers/testHelpers';
import {
  createTestChore,
  createTestComment,
  createTestHousehold,
  createTestUser,
} from './helpers/testFactory';

async function setup() {
  const household = await createTestHousehold();
  const { user: owner } = await createTestUser({
    householdId: household.id,
    role: 'Owner',
    firstName: 'Ana',
  });
  const { user: marko } = await createTestUser({ householdId: household.id, firstName: 'Marko' });
  const { user: jelena } = await createTestUser({ householdId: household.id, firstName: 'Jelena' });
  return { household, owner, marko, jelena };
}

async function notificationsOf(userId: number) {
  return await prisma.notification.findMany({ where: { userId }, orderBy: { id: 'asc' } });
}

describe('Chores', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('anyone can create a chore for anyone; the assignee is notified, the creator is not', async () => {
    const { marko, jelena } = await setup();

    const res = await request(app)
      .post('/chores')
      .set('Authorization', bearer(marko))
      .send({ title: 'Vacuum the living room', dueDate: '2026-10-20', assigneeId: jelena.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'Open',
      recurrence: 'None',
      createdBy: { id: marko.id },
      assignee: { id: jelena.id, firstName: 'Jelena' },
    });
    const notifications = await notificationsOf(jelena.id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'ChoreAssigned',
      message: 'Marko assigned you a chore: Vacuum the living room',
    });
    expect(await notificationsOf(marko.id)).toHaveLength(0);
  });

  it('cannot assign a chore to someone from another household', async () => {
    const { marko } = await setup();
    const other = await createTestHousehold('Other');
    const { user: stranger } = await createTestUser({ householdId: other.id });

    const res = await request(app)
      .post('/chores')
      .set('Authorization', bearer(marko))
      .send({ title: 'Dishes', assigneeId: stranger.id });

    expect(res.status).toBe(403);
  });

  it('an unassigned chore can be claimed once; a second claimer gets 409', async () => {
    const { household, owner, marko, jelena } = await setup();
    const chore = await createTestChore({ householdId: household.id, createdById: owner.id });

    const first = await request(app)
      .post(`/chores/${chore.id}/claim`)
      .set('Authorization', bearer(marko));
    const again = await request(app)
      .post(`/chores/${chore.id}/claim`)
      .set('Authorization', bearer(marko));
    const second = await request(app)
      .post(`/chores/${chore.id}/claim`)
      .set('Authorization', bearer(jelena));

    expect(first.body.assignee.id).toBe(marko.id);
    expect(again.status).toBe(200);
    expect(second.status).toBe(409);
  });

  it('the assignee can hand the chore over to someone else, who gets notified', async () => {
    const { household, owner, marko, jelena } = await setup();
    const chore = await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      assigneeId: marko.id,
    });

    const res = await request(app)
      .put(`/chores/${chore.id}`)
      .set('Authorization', bearer(marko))
      .send({ assigneeId: jelena.id });

    expect(res.body.assignee.id).toBe(jelena.id);
    expect((await notificationsOf(jelena.id))[0]?.type).toBe('ChoreAssigned');
  });

  it("an unrelated member cannot edit, complete or delete someone else's assigned chore", async () => {
    const { household, owner, marko, jelena } = await setup();
    const chore = await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      assigneeId: marko.id,
    });

    const edit = await request(app)
      .put(`/chores/${chore.id}`)
      .set('Authorization', bearer(jelena))
      .send({ title: 'Changed' });
    const complete = await request(app)
      .post(`/chores/${chore.id}/complete`)
      .set('Authorization', bearer(jelena));
    const remove = await request(app)
      .delete(`/chores/${chore.id}`)
      .set('Authorization', bearer(marko));

    expect([edit.status, complete.status, remove.status]).toEqual([403, 403, 403]);
  });

  it('completing notifies the creator and a second completion returns 409', async () => {
    const { household, owner, marko } = await setup();
    const chore = await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      assigneeId: marko.id,
      title: 'Dishes',
    });

    const done = await request(app)
      .post(`/chores/${chore.id}/complete`)
      .set('Authorization', bearer(marko));
    const twice = await request(app)
      .post(`/chores/${chore.id}/complete`)
      .set('Authorization', bearer(marko));

    expect(done.body.chore).toMatchObject({ status: 'Done', completedBy: { id: marko.id } });
    expect(done.body.nextChore).toBeNull();
    expect(twice.status).toBe(409);
    expect((await notificationsOf(owner.id))[0]).toMatchObject({
      type: 'ChoreCompleted',
      message: 'Marko completed: Dishes',
    });
  });

  it('completing a recurring chore creates the next occurrence for the same person', async () => {
    const { household, owner, marko } = await setup();
    const chore = await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      assigneeId: marko.id,
      recurrence: 'Monthly',
      dueDate: new Date('2026-01-31'),
    });

    const res = await request(app)
      .post(`/chores/${chore.id}/complete`)
      .set('Authorization', bearer(marko));

    expect(res.body.nextChore).toMatchObject({
      status: 'Open',
      recurrence: 'Monthly',
      assigneeId: marko.id,
      dueDate: '2026-02-28T00:00:00.000Z',
    });
  });

  it('priority defaults to Normal, is editable and carries over to the next occurrence', async () => {
    const { owner } = await setup();
    const created = await request(app)
      .post('/chores')
      .set('Authorization', bearer(owner))
      .send({ title: 'Pay rent', recurrence: 'Yearly', dueDate: '2028-02-29' });
    const edited = await request(app)
      .put(`/chores/${created.body.id}`)
      .set('Authorization', bearer(owner))
      .send({ priority: 'High' });
    const done = await request(app)
      .post(`/chores/${created.body.id}/complete`)
      .set('Authorization', bearer(owner));

    expect(created.body.priority).toBe('Normal');
    expect(edited.body.priority).toBe('High');
    expect(done.body.nextChore).toMatchObject({
      priority: 'High',
      dueDate: '2029-02-28T00:00:00.000Z',
    });
  });

  it('a done chore cannot be edited until reopened', async () => {
    const { household, owner } = await setup();
    const chore = await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      status: 'Done',
    });

    const edit = await request(app)
      .put(`/chores/${chore.id}`)
      .set('Authorization', bearer(owner))
      .send({ title: 'x' });
    const reopen = await request(app)
      .post(`/chores/${chore.id}/reopen`)
      .set('Authorization', bearer(owner));

    expect(edit.status).toBe(409);
    expect(reopen.body).toMatchObject({ status: 'Open', completedAt: null });
  });

  it('GET /chores filters by due date range (calendar) and unassigned', async () => {
    const { household, owner, marko } = await setup();
    await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      title: 'Sep',
      dueDate: new Date('2026-09-30'),
    });
    await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      title: 'Oct free',
      dueDate: new Date('2026-10-05'),
    });
    await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      title: 'Oct taken',
      assigneeId: marko.id,
      dueDate: new Date('2026-10-06'),
    });

    const october = await request(app)
      .get('/chores?dueFrom=2026-10-01&dueTo=2026-10-31')
      .set('Authorization', bearer(owner));
    const free = await request(app)
      .get('/chores?unassigned=true')
      .set('Authorization', bearer(owner));

    expect(october.body.data.map((c: { title: string }) => c.title)).toEqual([
      'Oct free',
      'Oct taken',
    ]);
    expect(free.body.data.map((c: { title: string }) => c.title)).toEqual(['Sep', 'Oct free']);
  });

  it('chores of another household are forbidden', async () => {
    const { marko } = await setup();
    const other = await createTestHousehold('Other');
    const { user: stranger } = await createTestUser({ householdId: other.id });
    const chore = await createTestChore({ householdId: other.id, createdById: stranger.id });

    const get = await request(app).get(`/chores/${chore.id}`).set('Authorization', bearer(marko));
    const claim = await request(app)
      .post(`/chores/${chore.id}/claim`)
      .set('Authorization', bearer(marko));
    const list = await request(app).get('/chores').set('Authorization', bearer(marko));

    expect([get.status, claim.status]).toEqual([403, 403]);
    expect(list.body.meta.total).toBe(0);
  });

  it('comments notify the creator and assignee (not the author); deleting the chore removes them', async () => {
    const { household, owner, marko, jelena } = await setup();
    const chore = await createTestChore({
      householdId: household.id,
      createdById: owner.id,
      assigneeId: marko.id,
      title: 'Laundry',
    });

    const comment = await request(app)
      .post(`/chores/${chore.id}/comments`)
      .set('Authorization', bearer(jelena))
      .send({ text: 'Use the cold program' });
    const list = await request(app)
      .get(`/chores/${chore.id}/comments`)
      .set('Authorization', bearer(owner));

    expect(comment.status).toBe(201);
    expect(comment.body.author.id).toBe(jelena.id);
    expect(list.body.data).toHaveLength(1);
    expect((await notificationsOf(owner.id))[0]?.message).toBe('Jelena commented on: Laundry');
    expect((await notificationsOf(marko.id))[0]?.type).toBe('ChoreCommented');
    expect(await notificationsOf(jelena.id)).toHaveLength(0);

    const removed = await request(app)
      .delete(`/chores/${chore.id}`)
      .set('Authorization', bearer(owner));
    expect(removed.status).toBe(200);
    expect(await prisma.comment.count()).toBe(0);
  });

  it('only the author or an Owner can edit a comment', async () => {
    const { household, owner, marko, jelena } = await setup();
    const chore = await createTestChore({ householdId: household.id, createdById: owner.id });
    const comment = await createTestComment({
      choreId: chore.id,
      authorId: marko.id,
      householdId: household.id,
    });

    const byOther = await request(app)
      .put(`/comments/${comment.id}`)
      .set('Authorization', bearer(jelena))
      .send({ text: 'x' });
    const byOwner = await request(app)
      .delete(`/comments/${comment.id}`)
      .set('Authorization', bearer(owner));

    expect(byOther.status).toBe(403);
    expect(byOwner.status).toBe(200);
  });
});
