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

const JWT_SECRET = process.env.JWT_SECRET!;

export class AttendanceRouter {
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private attendanceController: AttendanceController;

  constructor() {
    this.router = Router();
    this.jwtMiddleware = new JwtMiddleware();
    this.attendanceController = new AttendanceController();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
   
    this.router.post(
      "/check-in",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER, Role.DRIVER,Role.OUTLET_ADMIN]),
      (req, res, next) =>
        this.attendanceController.createCheckIn(req, res, next)
    );

   
    this.router.post(
      "/check-out",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      this.jwtMiddleware.verifyRole([Role.WORKER, Role.DRIVER,Role.OUTLET_ADMIN]),
      (req, res, next) =>
        this.attendanceController.createCheckOut(req, res, next)
    );

    this.router.get(
      "/log",
      this.jwtMiddleware.verifyToken(JWT_SECRET),
      validateQuery(GetAttendanceLogDTO),
      (req, res, next) => this.attendanceController.getLog(req, res, next)
    );

  
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
