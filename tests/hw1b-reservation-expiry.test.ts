import { describe, expect, it } from 'vitest';
import { Ticket } from '@tartan/db';
import {
    RESERVATION_HOLD_MS,
    isReservationExpired,
} from '../services/ticket-service/reservationExpiry';

describe('reservation expiry', () => {
    const createdAt = new Date('2026-09-05T12:00:00Z');

    const makeTicket = (status = 'reserved') =>
        ({
            status,
            createdAt,
        }) as Ticket;

    it('keeps a reserved seat active before the 10-minute hold expires', () => {
        const nowMs =
            createdAt.getTime() + RESERVATION_HOLD_MS - 1;

        expect(
            isReservationExpired(makeTicket(), nowMs),
        ).toBe(false);
    });

    it('expires a reserved seat when the 10-minute hold has elapsed', () => {
        const nowMs =
            createdAt.getTime() + RESERVATION_HOLD_MS;

        expect(
            isReservationExpired(makeTicket(), nowMs),
        ).toBe(true);
    });

    it('does not treat a booked ticket as an expired reservation', () => {
        const nowMs =
            createdAt.getTime() + RESERVATION_HOLD_MS + 60_000;

        expect(
            isReservationExpired(makeTicket('booked'), nowMs),
        ).toBe(false);
    });
});