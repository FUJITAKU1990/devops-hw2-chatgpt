import { Ticket } from '@tartan/db';
export const RESERVATION_HOLD_MS = 10 * 60 * 1000;
export const isReservationExpired = (
    ticket: Ticket,
    nowMs = Date.now(),
): boolean => {
    return (
        ticket.status === 'reserved' &&
        nowMs - new Date(ticket.createdAt).getTime() >= RESERVATION_HOLD_MS
    );
};