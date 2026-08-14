import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Ticket } from "./Ticket";
import { TicketType } from "./TicketType";
import { SeatMap } from "./SeatMap";

@Entity("events")
export class Event {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ name: "external_id", type: "varchar", nullable: true, unique: true })
    externalId: string | null;

    @Column()
    name: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column()
    date: Date;

    @Column({ nullable: true })
    location: string;

    @Column({ length: 1000, nullable: true })
    image: string;

    @Column({ default: "PUBLISHED" })
    status: string;

    @Column({ type: "timestamptz", nullable: true, name: "publish_at" })
    publishAt: Date | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @OneToMany(() => Ticket, (ticket) => ticket.event)
    tickets: Ticket[];

    @OneToMany(() => TicketType, (tt) => tt.event)
    ticketTypes: TicketType[];

    @ManyToOne(() => SeatMap, (seatMap) => seatMap.events, { nullable: true })
    @JoinColumn({ name: "seat_map_id" })
    seatMap: SeatMap;
}
