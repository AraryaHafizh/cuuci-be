// src/modules/attendance/attendance.router.ts
import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateQuery } from "../../middlewares/validation.middleware";
import {
  GetAttendanceLogDTO,
  GetAttendanceReportDTO,
} from "./dto/attendance.dto";
import { Role } from "../../generated/prisma/enums";
import { JWT_SECRET } from "../../config/env";

export class AttendanceRouter {
  private router: Router;
  private attendanceController: AttendanceController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.attendanceController = new AttendanceController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    // ----------------------------------------
    // CHECK-IN
    // ----------------------------------------
    this.router.post(
      "/check-in",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole([
        Role.WORKER,
        Role.DRIVER,
        Role.OUTLET_ADMIN,
      ]),
      this.attendanceController.createCheckIn
    );

    // ----------------------------------------
    // CHECK-OUT
    // ----------------------------------------
    this.router.post(
      "/check-out",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole([
        Role.WORKER,
        Role.DRIVER,
        Role.OUTLET_ADMIN,
      ]),
      this.attendanceController.createCheckOut
    );

    // ----------------------------------------
    // USER ATTENDANCE LOG
    // ----------------------------------------
    this.router.get(
      "/user-log",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      validateQuery(GetAttendanceLogDTO),
      this.attendanceController.getUserAttendanceLog
    );

    // ----------------------------------------
    // OUTLET ATTENDANCE REPORT
    // ----------------------------------------
    this.router.get(
      "/report",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole([Role.OUTLET_ADMIN, Role.SUPER_ADMIN]),
      validateQuery(GetAttendanceReportDTO),
      this.attendanceController.getOutletAttendanceReport
    );
  };

  getRouter = () => {
    return this.router;
  };
}
