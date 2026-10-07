import request from 'supertest';
import app from '../src/app';
import { cleanDatabase, disconnectDb } from './helpers/testDb';
import { bearer } from './helpers/testHelpers';
import { createTestHousehold, createTestNotification, createTestUser } from './helpers/testFactory';

describe('Notification', () => {
  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('lists only my own notifications, and isRead=false gives the unread count', async () => {
    const household = await createTestHousehold();
    const { user: me } = await createTestUser({ householdId: household.id });
    const { user: other } = await createTestUser({ householdId: household.id });
    await createTestNotification({ userId: me.id });
    await createTestNotification({ userId: me.id, isRead: true });
    await createTestNotification({ userId: other.id });

    const all = await request(app).get('/notifications').set('Authorization', bearer(me));
    const unread = await request(app)
      .get('/notifications?isRead=false')
      .set('Authorization', bearer(me));

    expect(all.body.meta.total).toBe(2);
    expect(unread.body.meta.total).toBe(1);
  });

  it("cannot mark someone else's notification as read (403)", async () => {
    const household = await createTestHousehold();
    const { user: me } = await createTestUser({ householdId: household.id });
    const { user: other } = await createTestUser({ householdId: household.id });
    const notification = await createTestNotification({ userId: other.id });

    const res = await request(app)
      .put(`/notifications/${notification.id}`)
      .set('Authorization', bearer(me))
      .send({ isRead: true });

    expect(res.status).toBe(403);
  });

  it('read-all marks only my unread notifications as read', async () => {
    const household = await createTestHousehold();
    const { user: me } = await createTestUser({ householdId: household.id });
    const { user: other } = await createTestUser({ householdId: household.id });
    await createTestNotification({ userId: me.id });
    await createTestNotification({ userId: me.id });
    await createTestNotification({ userId: other.id });

    const res = await request(app).post('/notifications/read-all').set('Authorization', bearer(me));
    const otherUnread = await request(app)
      .get('/notifications?isRead=false')
      .set('Authorization', bearer(other));

    expect(res.body).toEqual({ updated: 2 });
    expect(otherUnread.body.meta.total).toBe(1);
  });
});
