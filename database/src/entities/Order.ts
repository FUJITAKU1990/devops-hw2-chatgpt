import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { Event } from "./Event";
import { Ticket } from "./Ticket";

@Entity("orders")
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "record_locator", unique: true, length: 20 })
    recordLocator: string;

    @Column({ name: "user_id" })
    userId: number;

    @Column({ name: "event_id" })
    eventId: number;

    @Column({ name: "payment_transaction_id", nullable: true })
    paymentTransactionId: string | null;

    @Column({ name: "total_amount_cents", type: "int", default: 0 })
    totalAmountCents: number;

    @Column({ name: "coupon_code", nullable: true, length: 64 })
    couponCode: string | null;

    @Column({ name: "discount_amount_cents", type: "int", default: 0 })
    discountAmountCents: number;

    @Column({ default: "confirmed" }) // confirmed, cancelled, refunded
    status: string;

    @Column({ name: "fulfillment_status", default: "pending" })
    fulfillmentStatus: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => Event)
    @JoinColumn({ name: "event_id" })
    event: Event;

    @OneToMany(() => Ticket, (ticket) => ticket.order)
    tickets: Ticket[];
}
