// src/modules/attendance/attendance.controller.ts
import { Request, Response } from "express";
import { AttendanceService } from "./attendance.service";
import {
  GetAttendanceLogDTO,
  GetAttendanceReportDTO,
} from "./dto/attendance.dto";
import { ApiError } from "../../utils/api-error";

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
    res.status(201).json({ success: true, data: attendance });
  };

  // POST /attendance/check-out
  createCheckOut = async (req: Request, res: Response) => {
    const auth = res.locals.user;
    if (!auth || !auth.id) {
      throw new ApiError("Unauthenticated", 401);
    }

    const updated = await this.attendanceService.checkOut(String(auth.id));
    res.status(200).json({ success: true, data: updated });
  };

  // GET /attendance/log?from=&to=&userId=
  getLog = async (req: Request, res: Response) => {
    const auth = res.locals.user;
    if (!auth || !auth.id) {
      throw new ApiError("Unauthenticated", 401);
    }

    // already validated by validateQuery(GetAttendanceLogDTO)
    const dto = req.query as unknown as GetAttendanceLogDTO;

    let targetUserId = String(auth.id);
    if (dto.userId && dto.userId !== targetUserId) {
      throw new ApiError("Forbidden to view other user's log", 403);
    }

    const list = await this.attendanceService.getUserAttendanceLog(
      targetUserId,
      dto
    );
    res.status(200).json({ success: true, data: list });
  };

  // GET /attendance/report?outletId=&from=&to=
  getReport = async (req: Request, res: Response) => {
    const auth = res.locals.user;
    if (!auth || !auth.id) {
      throw new ApiError("Unauthenticated", 401);
    }

    // already validated by validateQuery(GetAttendanceReportDTO)
    const dto = req.query as unknown as GetAttendanceReportDTO;

    const report =
      await this.attendanceService.getOutletAttendanceReport(dto);
    res.status(200).json({ success: true, data: report });
  };
}
