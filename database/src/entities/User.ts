import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from "typeorm";
import { Ticket } from "./Ticket";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column({ name: "password_hash" })
    passwordHash: string;

    @Column({ default: "student" })
    role: string;

    @Column({ name: "is_active", default: false })
    isActive: boolean;

    @Column({ name: "activation_token", nullable: true, unique: true })
    activationToken: string | null;

    @Column({ name: "activation_token_expires_at", type: "timestamp", nullable: true })
    activationTokenExpiresAt: Date | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @OneToMany(() => Ticket, (ticket) => ticket.user)
    tickets: Ticket[];
}
