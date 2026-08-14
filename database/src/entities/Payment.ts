import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("payments")
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "transaction_id", type: "uuid" })
    transactionId: string;

    @Column({ type: "int" })
    amount: number;

    @Column()
    status: string; // pending, completed, failed, refunded

    @Column({ name: "card_last4", length: 4, nullable: true })
    cardLast4: string;

    @Column({ name: "card_brand", length: 50, nullable: true })
    cardBrand: string;

    @Column({ name: "processed_at", type: "timestamptz" })
    processedAt: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
}
