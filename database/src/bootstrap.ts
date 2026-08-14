import * as bcrypt from "bcryptjs";
import { AppDataSource } from "./data-source";
import { User } from "./entities/User";

/**
 * Production-safe bootstrap: create or update the admin user from TARTAN_ADMIN_* env vars.
 * When vars are set, the admin password is synced on every run.
 */
export async function runBootstrap(): Promise<void> {
    const email = process.env.TARTAN_ADMIN_EMAIL;
    const password = process.env.TARTAN_ADMIN_PASSWORD;
    const name = process.env.TARTAN_ADMIN_NAME ?? "Admin";

    if (!email || !password) {
        console.log(
            "Bootstrap: TARTAN_ADMIN_EMAIL and TARTAN_ADMIN_PASSWORD not set; skipping admin creation."
        );
        return;
    }

    const userRepo = AppDataSource.getRepository(User);
    let admin = await userRepo.findOneBy({ email });
    const passwordHash = bcrypt.hashSync(password, 10);

    if (!admin) {
        admin = userRepo.create({
            name,
            email,
            passwordHash,
            role: "admin",
            isActive: true,
            activationToken: null,
            activationTokenExpiresAt: null,
        });
    } else {
        admin.passwordHash = passwordHash;
        admin.role = "admin";
        admin.name = name;
        admin.isActive = true;
        admin.activationToken = null;
        admin.activationTokenExpiresAt = null;
    }
    await userRepo.save(admin);
    console.log("Bootstrap: admin user ready.");
}

async function main(): Promise<void> {
    await AppDataSource.initialize();
    console.log("Database connected.");
    await runBootstrap();
    console.log("Bootstrap complete.");
    process.exit(0);
}

if (require.main === module) {
    main().catch((err) => {
        console.error("Bootstrap failed.", err);
        process.exit(1);
    });
}
