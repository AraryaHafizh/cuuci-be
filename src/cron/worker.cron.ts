import cron from "node-cron";
import { WorkerService } from "../modules/worker/worker.service";

const workerService = new WorkerService();

/**
 * Cron: auto-checkout expired worker shifts.
 *
 * Runs every 5 minutes:
 * - Finds Worker rows where endTime is null
 * - Uses shift (MORNING/NOON) and startTime to decide if shift has passed
 * - Sets endTime automatically when expired.
 */
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("[CRON][Worker] Auto-checkout expired shifts start");
    const result = await workerService.autoCheckoutExpiredShifts();
    console.log("[CRON][Worker] Done:", result);
  } catch (error) {
    console.error("[CRON][Worker] Failed:", error);
  }
});

export {};
