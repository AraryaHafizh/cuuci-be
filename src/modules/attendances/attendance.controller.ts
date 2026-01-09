// src/modules/attendance/attendance.controller.ts
import { Request, Response, NextFunction } from "express";
import { AttendanceService } from "./attendance.service";
import {
  CheckInDTO,
  CheckOutDTO,
  GetAttendanceLogDTO,
  GetAttendanceReportDTO,
} from "./dto/attendance.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ApiError } from "../../utils/api-error";

const service = new AttendanceService();

function formatValidationErrors(errors: any[]) {
  return errors.map((e) => ({
    property: e.property,
    constraints: e.constraints,
  }));
}

export class AttendanceController {
  getStatus = async (req: Request, res: Response) => {
    const id = res.locals.user.id;
    const role = res.locals.user.role;
    const result = await service.getStatus(id, role);
    return res.status(200).send(result);
  };
  // POST /attendance/check-in
  createCheckIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // JwtMiddleware sets res.locals.user
      const auth = res.locals.user;
      if (!auth || !auth.id) throw new ApiError("Unauthenticated", 401);
      const attendance = await service.checkIn(String(auth.id));
      return res.status(201).json({ success: true, data: attendance });
    } catch (err: any) {
      return next(err);
    }
  };

  // POST /attendance/check-out
  createCheckOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.user;
      if (!auth || !auth.id) throw new ApiError("Unauthenticated", 401);
      const updated = await service.checkOut(String(auth.id));
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return next(err);
    }
  };

  // GET /attendance/log?from=&to=&userId=
  getLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.user;
      const id = req.params.id;
      if (!auth || !auth.id) throw new ApiError("Unauthenticated", 401);

      const dto = plainToInstance(GetAttendanceLogDTO, req.query || {});
      const errors = await validate(dto);
      if (errors.length)
        throw new ApiError(
          formatValidationErrors(errors)
            .map(
              (e) => e.property + ": " + Object.values(e.constraints).join(", ")
            )
            .join("; "),
          400
        );

      // If dto.userId provided and not equal to auth user id, deny (role-based check should be via JwtMiddleware.verifyRole)
      let targetUserId = String(auth.id);
      if (dto.userId && dto.userId !== targetUserId) {
        throw new ApiError("Forbidden to view other user's log", 403);
      }

      const list = await service.getUserAttendanceLog(id, dto);
      return res.status(200).json({ success: true, data: list });
    } catch (err: any) {
      return next(err);
    }
  };

  // GET /attendance/report?outletId=&from=&to=
  getReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.user;
      if (!auth || !auth.id) throw new ApiError("Unauthenticated", 401);

      const dto = plainToInstance(GetAttendanceReportDTO, req.query || {});
      const errors = await validate(dto);
      if (errors.length)
        throw new ApiError(
          formatValidationErrors(errors)
            .map(
              (e) => e.property + ": " + Object.values(e.constraints).join(", ")
            )
            .join("; "),
          400
        );

      const report = await service.getOutletAttendanceReport(dto);
      return res.status(200).json({ success: true, data: report });
    } catch (err: any) {
      return next(err);
    }
  };
}
