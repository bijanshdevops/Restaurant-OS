import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin, TestClient } from './helpers';

describe('رزرواسیون: تشخیص تداخل زمانی و چرخه وضعیت میز', () => {
  let admin: TestClient;
  let tableId: string;

  beforeAll(async () => {
    admin = await loginAsAdmin();
    const number = 9000 + Math.floor(Math.random() * 1000);
    const res = await admin.call('createTable', number, 4);
    expect(res.success).toBe(true);
    tableId = res.table.id;
  });

  it('رزرو دوم روی همان میز در بازه‌ی نزدیک رد می‌شود', async () => {
    const time = new Date(Date.now() + 3 * 60 * 60000).toISOString();
    const first = await admin.call('createReservation', {
      tableId,
      guestName: 'مشتری تست ۱',
      guestPhone: '09120000001',
      partySize: 2,
      reservationTime: time,
    });
    expect(first.success).toBe(true);

    const second = await admin.call('createReservation', {
      tableId,
      guestName: 'مشتری تست ۲',
      guestPhone: '09120000002',
      partySize: 2,
      reservationTime: time,
    });
    expect(second.success).toBe(false);

    // پاکسازی
    await admin.call('updateReservationStatus', first.reservation.id, 'CANCELLED');
  });

  it('وضعیت میز با چرخه‌ی رزرو هماهنگ می‌شود (تایید، نشستن، پایان)', async () => {
    const time = new Date(Date.now() + 6 * 60 * 60000).toISOString();
    const created = await admin.call('createReservation', {
      tableId,
      guestName: 'مشتری تست ۳',
      guestPhone: '09120000003',
      partySize: 2,
      reservationTime: time,
    });
    expect(created.success).toBe(true);

    await admin.call('updateReservationStatus', created.reservation.id, 'CONFIRMED');
    let tables = await admin.call('getTables');
    let table = tables.tables.find((t: any) => t.id === tableId);
    expect(table.status).toBe('RESERVED');

    await admin.call('updateReservationStatus', created.reservation.id, 'SEATED');
    tables = await admin.call('getTables');
    table = tables.tables.find((t: any) => t.id === tableId);
    expect(table.status).toBe('OCCUPIED');

    await admin.call('updateReservationStatus', created.reservation.id, 'COMPLETED');
    tables = await admin.call('getTables');
    table = tables.tables.find((t: any) => t.id === tableId);
    expect(table.status).toBe('AVAILABLE');
  });
});
