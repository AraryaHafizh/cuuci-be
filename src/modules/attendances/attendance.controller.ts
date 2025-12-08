// src/modules/attendance/attendance.controller.ts
import { Request, Response } from "express";
import { AttendanceService } from "./attendance.service";
import {
  GetAttendanceLogDTO,
  GetAttendanceReportDTO,
} from "./dto/attendance.dto";
import { ApiError } from "../../utils/api-error";
import { Shift } from "../../generated/prisma/enums"; // ✅ NEW

// ✅ helper to derive shift from checkIn time
const getShiftFromDate = (date: Date): Shift => {
  const hour = date.getHours();
  return hour < 12 ? Shift.MORNING : Shift.NOON;
};

export class AttendanceController {
  private attendanceService: AttendanceService;

  constructor() {
    this.attendanceService = new AttendanceService();
  }

  // POST /attendance/check-in
  createCheckIn = async (req: Request, res: Response) => {
    const auth = res.locals.user;
    if (!auth || !auth.id) {
      throw new ApiError("Unauthenticated", 401);
    }

    const attendance = await this.attendanceService.checkIn(String(auth.id));

    // ✅ add shift based on checkIn time
    const responseData = {
      ...attendance,
      shift: getShiftFromDate(new Date(attendance.checkIn)),
    };

    res.status(201).json({ success: true, data: responseData });
  };

  // POST /attendance/check-out
  createCheckOut = async (req: Request, res: Response) => {
    const auth = res.locals.user;
    if (!auth || !auth.id) {
      throw new ApiError("Unauthenticated", 401);
    }

    const updated = await this.attendanceService.checkOut(String(auth.id));

    // ✅ add shift based on original checkIn time
    const responseData = {
      ...updated,
      shift: getShiftFromDate(new Date(updated.checkIn)),
    };

    res.status(200).json({ success: true, data: responseData });
  };

  // GET /attendance/log?from=&to=&userId=
  // src/modules/attendance/attendance.controller.ts

  getUserAttendanceLog = async (req: Request, res: Response) => {
    const auth = res.locals.user; // Already verified by JWT middleware
    const page = +(req.query.page || 1);
    const limit = +(req.query.limit || 10);

    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const result = await this.attendanceService.getUserAttendanceLog(
      auth.id, // no need to parse dto.userId here
      page,
      limit,
      from,
      to
    );

    res.status(200).json(result);
  };

  // GET /attendance/report?outletId=&from=&to=
  // src/modules/attendance/attendance.controller.ts

  getOutletAttendanceReport = async (req: Request, res: Response) => {
    const auth = res.locals.user; // already verified by JWT
    const page = +(req.query.page || 1);
    const limit = +(req.query.limit || 10);

    const outletId = req.query.outletId as string;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const result = await this.attendanceService.getOutletAttendanceReport({
      requesterId: auth.id,
      outletId,
      page,
      limit,
      from,
      to,
    });

    res.status(200).json(result);
  };
}
