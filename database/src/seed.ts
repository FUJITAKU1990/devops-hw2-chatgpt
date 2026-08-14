import { AppDataSource } from "./data-source";
import { runBootstrap } from "./bootstrap";
import { runFixtures } from "./fixtures";

async function seed(): Promise<void> {
    await AppDataSource.initialize();
    console.log("Database connected.");

    await runBootstrap();
    await runFixtures();

    console.log("Seeding complete.");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seeding failed.", err);
    process.exit(1);
});
