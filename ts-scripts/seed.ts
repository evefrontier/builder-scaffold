import "dotenv/config";
import { getEnvConfig, handleError } from "./utils/helper";
import { readSeedResources, upsertSeedResources } from "./utils/config";

/**
 * Local seeding script — runs automatically at the end of pnpm setup-world.
 * Add your own on-chain setup steps here (inventory seeding, minting, etc.).
 *
 * State is tracked in deployments/<network>/seed-resources.json.
 * Already-completed steps are skipped — safe to re-run at any time.
 * The file is cleared by pnpm rebuild-world, so re-seeding runs automatically
 * after a chain reset.
 *
 * Example step shape:
 *
 *   async function seedMyCustomStep(env: ReturnType<typeof getEnvConfig>): Promise<void> {
 *       const seeds = readSeedResources(env.network);
 *       if (seeds.myCustomStep) { console.log("  [skip]"); return; }
 *
 *       // ... build and execute your transaction(s) ...
 *
 *       upsertSeedResources(env.network, (data) => {
 *           data.myCustomStep = { objectId: "0x...", quantity: 10 };
 *       });
 *       console.log("  [done] my custom step");
 *   }
 *
 * Then call it from main():
 *   await seedMyCustomStep(env);
 */

/**
 * Example: writes a dummy entry to seed-resources.json to verify the pattern works.
 * Replace this with real transaction logic when adding your own seeding steps.
 */
async function seedExample(env: ReturnType<typeof getEnvConfig>): Promise<void> {
    const seeds = readSeedResources(env.network);
    if (seeds.example) {
        console.log("  [skip] example already seeded");
        return;
    }

    upsertSeedResources(env.network, (data) => {
        data.example = { note: "delete me — replace with a real seeding step" };
    });
    console.log("  [done] example seed written to seed-resources.json");
}

async function main() {
    console.log("============= Local Seeding ==============\n");

    try {
        const env = getEnvConfig();
        console.log(`Network: ${env.network}`);
        console.log(`Seed state: deployments/${env.network}/seed-resources.json\n`);

        await seedExample(env);

        console.log("\nSeeding complete.");
    } catch (error) {
        handleError(error);
    }
}

main();
