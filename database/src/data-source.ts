import "reflect-metadata";
import * as dotenv from "dotenv";

// Load .env file from the root or current directory
dotenv.config({ path: __dirname + "/../../.env" });
dotenv.config(); 

import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { Ticket } from "./entities/Ticket";
import { Order } from "./entities/Order";
import { Payment } from "./entities/Payment";
import { TicketType } from "./entities/TicketType";
import { SeatMap } from "./entities/SeatMap";
import { SupportReport } from "./entities/SupportReport";
import { CouponCode } from "./entities/CouponCode";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
}

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: true,
    logging: true,
    entities: [Event, Ticket, Order, TicketType, User, SeatMap, Payment, SupportReport, CouponCode],
    migrations: [],
    subscribers: [],
});
