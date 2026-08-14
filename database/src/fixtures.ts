import * as bcrypt from "bcryptjs";
import { AppDataSource } from "./data-source";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { TicketType } from "./entities/TicketType";
import { SeatMap } from "./entities/SeatMap";
import { CouponCode } from "./entities/CouponCode";

async function seedFixtureUsers(): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);
    const studentEmail = "student@cmu.edu";
    let student = await userRepo.findOneBy({ email: studentEmail });
    const studentPasswordHash = bcrypt.hashSync("student", 10);
    if (!student) {
        student = userRepo.create({
            name: "Student",
            email: studentEmail,
            passwordHash: studentPasswordHash,
            role: "student",
            isActive: true,
            activationToken: null,
            activationTokenExpiresAt: null,
        });
    } else {
        student.passwordHash = studentPasswordHash;
        student.isActive = true;
        student.activationToken = null;
        student.activationTokenExpiresAt = null;
    }
    await userRepo.save(student);
    console.log("Fixtures: student user ready.");
}

async function seedSeatMaps(): Promise<{ goslingSeatMap: SeatMap; wiegandSeatMap: SeatMap }> {
    const seatMapRepo = AppDataSource.getRepository(SeatMap);

    let seatMap = await seatMapRepo.findOneBy({ name: "Gosling Auditorium" });
    if (!seatMap) {
        seatMap = seatMapRepo.create({
            name: "Gosling Auditorium",
            config: {
                seatMapId: "gesling-v1",
                sections: [
                    {
                        id: "A",
                        label: "Orchestra Center",
                        rows: 10,
                        cols: 14,
                        aisles: [7],
                        rowLabelStart: "A",
                        colLabelStart: 1,
                        accessibleSeats: ["J1", "J2", "J13", "J14"],
                    },
                    {
                        id: "B",
                        label: "Orchestra Rear",
                        rows: 8,
                        cols: 16,
                        aisles: [5, 11],
                        rowLabelStart: "K",
                        colLabelStart: 1,
                        accessibleSeats: ["R1", "R2", "R15", "R16"],
                    },
                    {
                        id: "Balcony",
                        label: "Balcony",
                        rows: 6,
                        cols: 12,
                        aisles: [6],
                        rowLabelStart: "AA",
                        colLabelStart: 101,
                        accessibleSeats: ["AA101", "AA112"],
                    },
                ],
            },
        });
        await seatMapRepo.save(seatMap);
        console.log("Fixtures: created Gosling Auditorium seat map.");
    }

    let wiegandSeatMap = await seatMapRepo.findOneBy({ name: "Wiegand Gymnasium" });
    if (!wiegandSeatMap) {
        wiegandSeatMap = seatMapRepo.create({
            name: "Wiegand Gymnasium",
            config: {
                seatMapId: "wiegand-v1",
                sections: [
                    {
                        id: "FL",
                        label: "Floor",
                        rows: 20,
                        cols: 15,
                        aisles: [8],
                        rowLabelStart: "A",
                        colLabelStart: 1,
                        accessibleSeats: ["T1", "T2", "T14", "T15"],
                    },
                    {
                        id: "BL",
                        label: "Bleachers Left",
                        rows: 8,
                        cols: 12,
                        aisles: [],
                        rowLabelStart: "A",
                        colLabelStart: 101,
                        accessibleSeats: ["H101", "H112"],
                    },
                    {
                        id: "BR",
                        label: "Bleachers Right",
                        rows: 8,
                        cols: 12,
                        aisles: [],
                        rowLabelStart: "A",
                        colLabelStart: 201,
                        accessibleSeats: ["H201", "H212"],
                    },
                ],
            },
        });
        await seatMapRepo.save(wiegandSeatMap);
        console.log("Fixtures: created Wiegand Gymnasium seat map.");
    }

    return { goslingSeatMap: seatMap, wiegandSeatMap };
}

async function seedEvents(): Promise<void> {
    const eventRepo = AppDataSource.getRepository(Event);
    const ticketTypeRepo = AppDataSource.getRepository(TicketType);
    const couponRepo = AppDataSource.getRepository(CouponCode);

    const { goslingSeatMap, wiegandSeatMap } = await seedSeatMaps();

    const eventName = "Buggy Freeroll Practice";
    let event = await eventRepo.findOneBy({ name: eventName });
    if (!event) {
        event = eventRepo.create({
            name: eventName,
            description: "Early morning practice session.",
            date: new Date("2027-03-14T06:00:00"),
            location: "Schenley Park",
            image:
                "https://imgs.search.brave.com/YJvX14BeymeIjprmygxq7pxASWeOO33XZaNGZefrqvw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jbXVi/dWdneS5vcmcvbmV3/cy93cC1jb250ZW50/L3VwbG9hZHMvMjAy/NS8xMC9HQUc0NTE4/X2Rvd25zaXplZC5q/cGc",
            seatMap: goslingSeatMap,
        });
        await eventRepo.save(event);
        console.log("Fixtures: created Buggy event.");
    }

    const lunarGalaName = "Lunar Gala";
    let lunarGalaEvent = await eventRepo.findOneBy({ name: lunarGalaName });
    if (!lunarGalaEvent) {
        lunarGalaEvent = eventRepo.create({
            name: lunarGalaName,
            description:
                "CMU's annual student-run fashion show. Featuring original designs, modeling, dance performances, and avant-garde artistry — one of Carnegie Mellon's most beloved traditions.",
            date: new Date("2027-03-20T19:00:00"),
            location: "Wiegand Gymnasium",
            image:
                "https://www.cmu.edu/news/sites/default/files/styles/photo_grid_full_tablet_1x/public/2025-03/250322A_Lunar_Gala_JM_150.jpg.webp",
            seatMap: wiegandSeatMap,
        });
        await eventRepo.save(lunarGalaEvent);
        console.log("Fixtures: created Lunar Gala event.");
    }

    let ticketType = await ticketTypeRepo.findOne({
        where: { eventId: event.id, name: "General Admission" },
    });
    if (!ticketType) {
        ticketType = ticketTypeRepo.create({
            eventId: event.id,
            name: "General Admission",
            availabilityModel: "GA_POOL",
            pricingModel: "FREE",
            priceCents: 0,
            maxPerOrder: 10,
            maxPerUser: 10,
            available: 100,
        });
        await ticketTypeRepo.save(ticketType);
        console.log("Fixtures: created general admission ticket type for Buggy event.");
    }

    let reservedTicketType = await ticketTypeRepo.findOne({
        where: { eventId: event.id, name: "Reserved Seating" },
    });
    if (!reservedTicketType) {
        reservedTicketType = ticketTypeRepo.create({
            eventId: event.id,
            name: "Reserved Seating",
            availabilityModel: "RESERVED_SEATS",
            pricingModel: "FIXED",
            priceCents: 1000,
            maxPerOrder: 5,
            maxPerUser: 5,
            available: 50,
        });
        await ticketTypeRepo.save(reservedTicketType);
        console.log("Fixtures: created reserved seating ticket type for Buggy event.");
    }

    let lunarGalaTicket: TicketType | null = null;
    if (lunarGalaEvent) {
            lunarGalaTicket = await ticketTypeRepo.findOne({
            where: { eventId: lunarGalaEvent.id, name: "Reserved Seating" },
        });
        if (!lunarGalaTicket) {
            lunarGalaTicket = ticketTypeRepo.create({
                eventId: lunarGalaEvent.id,
                name: "Reserved Seating",
                availabilityModel: "RESERVED_SEATS",
                pricingModel: "FIXED",
                priceCents: 2500,
                maxPerOrder: 6,
                maxPerUser: 6,
                available: 500,
            });
            await ticketTypeRepo.save(lunarGalaTicket);
            console.log("Fixtures: created Lunar Gala tickets.");
        }
    }

    const coupons = [
        {
            code: "SPRING15",
            eventId: null,
            ticketTypeId: null,
            discountType: "PERCENT",
            percentOff: 15,
            amountOffCents: 0,
            startsAt: new Date("2027-03-01T00:00:00"),
            endsAt: new Date("2027-04-30T23:59:59"),
            maxRedemptions: 500,
        },
        lunarGalaEvent && lunarGalaTicket ? {
            code: "LUNARVIP",
            eventId: lunarGalaEvent.id,
            ticketTypeId: lunarGalaTicket.id,
            discountType: "PERCENT",
            percentOff: 20,
            amountOffCents: 0,
            startsAt: new Date("2027-03-10T00:00:00"),
            endsAt: new Date("2027-03-20T18:30:00"),
            maxRedemptions: 75,
        } : null,
        event && reservedTicketType ? {
            code: "BUGGYCREW",
            eventId: event.id,
            ticketTypeId: reservedTicketType.id,
            discountType: "AMOUNT",
            percentOff: 0,
            amountOffCents: 300,
            startsAt: new Date("2027-03-01T00:00:00"),
            endsAt: new Date("2027-03-14T05:30:00"),
            maxRedemptions: 40,
        } : null,
    ].filter(Boolean) as Array<{
        code: string;
        eventId: number | null;
        ticketTypeId: number | null;
        discountType: string;
        percentOff: number;
        amountOffCents: number;
        startsAt: Date;
        endsAt: Date;
        maxRedemptions: number;
    }>;

    for (const coupon of coupons) {
        const existing = await couponRepo.findOneBy({ code: coupon.code });
        if (!existing) {
            await couponRepo.save(couponRepo.create(coupon));
            console.log(`Fixtures: created coupon ${coupon.code}.`);
        }
    }
}

/**
 * Seed development/test fixtures: demo users, seat maps, events, and ticket types.
 * Do not run in production.
 */
export async function runFixtures(): Promise<void> {
    await seedFixtureUsers();
    await seedEvents();
}

async function main(): Promise<void> {
    await AppDataSource.initialize();
    console.log("Database connected.");
    await runFixtures();
    console.log("Fixtures complete.");
    process.exit(0);
}

if (require.main === module) {
    main().catch((err) => {
        console.error("Fixtures failed.", err);
        process.exit(1);
    });
}
