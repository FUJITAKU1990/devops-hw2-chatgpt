import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Event } from "./Event";

@Entity("ticket_types")
export class TicketType {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ name: "external_id", type: "varchar", nullable: true, unique: true })
    externalId: string | null;

    @Column({ name: "event_id", nullable: true })
    eventId: number;

    @Column()
    name: string;

    @Column({ name: "availability_model", type: "varchar", default: "GA_POOL" })
    availabilityModel: string; // GA_POOL | RESERVED_SEATS

    @Column({ name: "pricing_model", type: "varchar", default: "FREE" })
    pricingModel: string; // FREE | FIXED

    @Column({ name: "price_cents", type: "int", default: 0 })
    priceCents: number;

    @Column({ name: "max_per_order", type: "int", default: 0 })
    maxPerOrder: number;

    @Column({ name: "max_per_user", type: "int", default: 0 })
    maxPerUser: number;

    @Column({ name: "available", type: "int", default: 0 })
    available: number;

    @ManyToOne(() => Event, (event) => event.ticketTypes)
    @JoinColumn({ name: "event_id" })
    event: Event;
}