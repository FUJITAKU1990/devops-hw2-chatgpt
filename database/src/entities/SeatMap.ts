import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Event } from "./Event";

@Entity("seat_maps")
export class SeatMap {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: "json" })
    config: any;

    @OneToMany(() => Event, (event) => event.seatMap)
    events: Event[];
}
