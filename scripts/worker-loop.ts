import { runWorkerBatch } from "../src/lib/worker";
import { db } from "../src/lib/db";
import { setTimeout } from "node:timers/promises";
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    stopping = true;
  });
try {
  while (!stopping) {
    try {
      console.log(await runWorkerBatch());
    } catch (e) {
      console.error("Worker batch failed", e instanceof Error ? e.name : "UnknownError");
    }
    if (!stopping) await setTimeout(15000);
  }
} finally {
  await db.$disconnect();
}
