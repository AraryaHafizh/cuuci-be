import cron from "node-cron";
import { DriverService } from "../modules/driver/driver.service";

const driverService = new DriverService();

/**
 * Cron: auto-checkout expired driver sessions.
 *
 * Runs every 5 minutes:
 * - Finds Driver rows / sessions where endTime is null
 * - Uses your shift-boundary logic to determine expiry
 * - Sets endTime automatically when expired.
 */
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("[CRON][Driver] Auto-checkout expired driver sessions start");
    const result = await driverService.autoCheckoutExpiredDriverSessions();
    console.log("[CRON][Driver] Done:", result);
  } catch (error) {
    console.error("[CRON][Driver] Failed:", error);
  }
});

export {};
