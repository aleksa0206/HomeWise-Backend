import request from 'supertest';
import app from '../src/app';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { bearer } from './helpers/testHelpers';
import { createTestHousehold, createTestUser } from './helpers/testFactory';

describe('Registration, household and members', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('register creates a household with default categories and logs the Owner in', async () => {
    const res = await request(app).post('/auth/register').send({
      householdName: 'The Petrovics',
      firstName: 'Ana',
      lastName: 'Petrovic',
      email: 'ana@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.role).toBe('Owner');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/^refreshToken=.*HttpOnly/);

    const auth = `Bearer ${res.body.token}`;
    const household = await request(app).get('/households/me').set('Authorization', auth);
    const categories = await request(app).get('/categories').set('Authorization', auth);
    expect(household.body).toMatchObject({ name: 'The Petrovics', currency: 'RSD' });
    expect(categories.body.meta.total).toBeGreaterThan(0);
  });

  it('register with an email that already exists returns 409', async () => {
    const household = await createTestHousehold();
    await createTestUser({ householdId: household.id, email: 'taken@test.com' });

    const res = await request(app).post('/auth/register').send({
      householdName: 'Other',
      firstName: 'A',
      lastName: 'B',
      email: 'taken@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
  });

  it('only an Owner can rename the household; the change is audited', async () => {
    const household = await createTestHousehold();
    const { user: owner } = await createTestUser({ householdId: household.id, role: 'Owner' });
    const { user: member } = await createTestUser({ householdId: household.id });

    const denied = await request(app)
      .put('/households/me')
      .set('Authorization', bearer(member))
      .send({ name: 'Hacked' });
    const ok = await request(app)
      .put('/households/me')
      .set('Authorization', bearer(owner))
      .send({ name: 'Home', currency: 'EUR' });
    const audit = await request(app).get('/audit-logs').set('Authorization', bearer(owner));
    const memberAudit = await request(app).get('/audit-logs').set('Authorization', bearer(member));

    expect(denied.status).toBe(403);
    expect(ok.body).toMatchObject({ name: 'Home', currency: 'EUR' });
    expect(audit.body.data[0].action).toBe('UPDATE_HOUSEHOLD_NAME');
    expect(memberAudit.status).toBe(403);
  });

  it('the Owner adds a member, who can then log in and sees the same household', async () => {
    const household = await createTestHousehold();
    const { user: owner } = await createTestUser({ householdId: household.id, role: 'Owner' });

    const created = await request(app).post('/users').set('Authorization', bearer(owner)).send({
      firstName: 'Marko',
      lastName: 'Petrovic',
      email: 'marko@test.com',
      password: 'password123',
    });
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'marko@test.com', password: 'password123' });

    expect(created.status).toBe(201);
    expect(created.body.role).toBe('Member');
    expect(login.body.user.householdId).toBe(household.id);
  });

  it('a Member cannot add members, change roles or delete anyone', async () => {
    const household = await createTestHousehold();
    const { user: owner } = await createTestUser({ householdId: household.id, role: 'Owner' });
    const { user: member } = await createTestUser({ householdId: household.id });

    const add = await request(app).post('/users').set('Authorization', bearer(member)).send({
      firstName: 'X',
      lastName: 'Y',
      email: 'x@test.com',
      password: 'password123',
    });
    const promote = await request(app)
      .put(`/users/${member.id}`)
      .set('Authorization', bearer(member))
      .send({ role: 'Owner' });
    const remove = await request(app)
      .delete(`/users/${owner.id}`)
      .set('Authorization', bearer(member));

    expect([add.status, promote.status, remove.status]).toEqual([403, 403, 403]);
  });

  it('an Owner cannot demote or delete themselves, so the household keeps an Owner', async () => {
    const household = await createTestHousehold();
    const { user: owner } = await createTestUser({ householdId: household.id, role: 'Owner' });

    const demote = await request(app)
      .put(`/users/${owner.id}`)
      .set('Authorization', bearer(owner))
      .send({ role: 'Member' });
    const remove = await request(app)
      .delete(`/users/${owner.id}`)
      .set('Authorization', bearer(owner));

    expect([demote.status, remove.status]).toEqual([403, 403]);
  });

  it('members of another household are invisible (list) and forbidden (by id)', async () => {
    const mine = await createTestHousehold('Mine');
    const theirs = await createTestHousehold('Theirs');
    const { user: me } = await createTestUser({ householdId: mine.id, role: 'Owner' });
    const { user: stranger } = await createTestUser({ householdId: theirs.id });

    const list = await request(app).get('/users').set('Authorization', bearer(me));
    const byId = await request(app).get(`/users/${stranger.id}`).set('Authorization', bearer(me));
    const update = await request(app)
      .put(`/users/${stranger.id}`)
      .set('Authorization', bearer(me))
      .send({ firstName: 'Changed' });

    expect(list.body.data.map((u: { id: number }) => u.id)).toEqual([me.id]);
    expect(byId.status).toBe(403);
    expect(update.status).toBe(403);
  });
});
