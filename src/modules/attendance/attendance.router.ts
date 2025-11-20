// src/modules/attendance/attendance.router.ts
import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware"; // adjust path if needed
import { validateBody, validateQuery } from "../../middlewares/validation.middleware"; // adjust path
import { CheckInDTO, CheckOutDTO, GetAttendanceLogDTO, GetAttendanceReportDTO } from "./dto/attendance.dto";
import { Role } from "../../generated/prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

export class AttendanceRouter {
  private router = Router();
  private jwtMiddleware = new JwtMiddleware();

  constructor(private attendanceController: AttendanceController) {
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    // check-in (workers & drivers)
    this.router.post(
      "/check-in",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER, Role.DRIVER]),
      validateBody(CheckInDTO),
      (req, res, next) => this.attendanceController.createCheckIn(req, res, next)
    );

    // check-out (workers & drivers)
    this.router.post(
      "/check-out",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER, Role.DRIVER]),
      validateBody(CheckOutDTO),
      (req, res, next) => this.attendanceController.createCheckOut(req, res, next)
    );

    // log (self or admin) — admins can view reports; /log is self-only here
    this.router.get(
      "/log",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      validateQuery(GetAttendanceLogDTO),
      (req, res, next) => this.attendanceController.getLog(req, res, next)
    );

    // report (outlet admin / super admin) — includes both workers and drivers
    this.router.get(
      "/report",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.OUTLET_ADMIN, Role.SUPER_ADMIN]),
      validateQuery(GetAttendanceReportDTO),
      (req, res, next) => this.attendanceController.getReport(req, res, next)
    );
  };

  getRouter() {
    return this.router;
  }
}
