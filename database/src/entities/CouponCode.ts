import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Event } from "./Event";
import { TicketType } from "./TicketType";

@Entity("coupon_codes")
export class CouponCode {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ length: 64, unique: true })
    code: string;

    @Column({ name: "event_id", nullable: true })
    eventId: number | null;

    @Column({ name: "ticket_type_id", nullable: true })
    ticketTypeId: number | null;

    @Column({ name: "discount_type", default: "PERCENT" })
    discountType: string;

    @Column({ name: "percent_off", type: "int", default: 0 })
    percentOff: number;

    @Column({ name: "amount_off_cents", type: "int", default: 0 })
    amountOffCents: number;

    @Column({ default: true })
    active: boolean;

    @Column({ name: "starts_at", type: "timestamptz", nullable: true })
    startsAt: Date | null;

    @Column({ name: "ends_at", type: "timestamptz", nullable: true })
    endsAt: Date | null;

    @Column({ name: "max_redemptions", type: "int", default: 0 })
    maxRedemptions: number;

    @Column({ name: "current_redemptions", type: "int", default: 0 })
    currentRedemptions: number;

    @ManyToOne(() => Event, { nullable: true })
    @JoinColumn({ name: "event_id" })
    event: Event | null;

    @ManyToOne(() => TicketType, { nullable: true })
    @JoinColumn({ name: "ticket_type_id" })
    ticketType: TicketType | null;
}