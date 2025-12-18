import cron from "node-cron";
import { AttendanceService } from "../modules/attendances/attendance.service"

const attendanceService = new AttendanceService();

/**
 * Cron: auto-checkout expired attendance records.
 *
 * Runs every 5 minutes:
 * - Finds attendance rows where:
 *   - checkIn is today
 *   - checkOut is still null
 *   - and shift boundary already passed (based on your logic in AttendanceService)
 * - Sets checkOut automatically.
 */
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("[CRON][Attendance] Auto-checkout expired attendance start");
    const result = await attendanceService.autoCheckoutExpiredAttendance();
    console.log("[CRON][Attendance] Done:", result);
  } catch (error) {
    console.error("[CRON][Attendance] Failed:", error);
  }
});

export {}; // ensure ES module behavior
