import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity("support_reports")
export class SupportReport {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "user_id", nullable: true })
    userId: number | null;

    @Column({ length: 120, nullable: true })
    name: string | null;

    @Column({ length: 255, nullable: true })
    email: string | null;

    @Column({ name: "is_bot", type: "boolean", default: false })
    isBot: boolean;

    @Column({ length: 180 })
    subject: string;

    @Column({ type: "text" })
    description: string;

    @Column({ name: "page_url", length: 1000, nullable: true })
    pageUrl: string | null;

    @Column({ name: "user_agent", length: 500, nullable: true })
    userAgent: string | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "user_id" })
    user: User | null;
}
