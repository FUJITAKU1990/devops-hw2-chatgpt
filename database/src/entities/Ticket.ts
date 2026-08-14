import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { Event } from "./Event";
import { Order } from "./Order";

@Entity("tickets")
export class Ticket {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId: number;

    @Column({ name: "event_id", nullable: true })
    eventId: number;

    @Column({ name: "order_id", nullable: true })
    orderId: number | null;

    @Column({ default: "reserved" }) // reserved, booked, cancelled
    status: string;

    @Column({ name: "seat_number", nullable: true })
    seatNumber: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.tickets)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => Event, (event) => event.tickets)
    @JoinColumn({ name: "event_id" })
    event: Event;

    @ManyToOne(() => Order, (order) => order.tickets, { nullable: true })
    @JoinColumn({ name: "order_id" })
    order: Order | null;
}
