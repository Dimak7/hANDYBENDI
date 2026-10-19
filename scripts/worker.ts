import { runWorkerBatch } from "../src/lib/worker";
import { db } from "../src/lib/db";
try {
  console.log(await runWorkerBatch());
} finally {
  await db.$disconnect();
}
