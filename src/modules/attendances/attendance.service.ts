// src/modules/attendance/attendance.service.ts
import { PrismaService } from "../prisma/prisma.service";
import { GetAttendanceLogDTO, GetAttendanceReportDTO } from "./dto/attendance.dto";
import { ApiError } from "../../utils/api-error";
import { Role } from "../../generated/prisma/enums";

export class AttendanceService {
  private prisma: PrismaService;
  // Now includes OUTLET_ADMIN so admins can also check-in/out and appear in reports
  private allowedRolesForAttendance: Role[] = [
    Role.WORKER,
    Role.DRIVER,
    Role.OUTLET_ADMIN,
  ];

  constructor() {
    this.prisma = new PrismaService();
  }

  // POST /attendance/check-in
  checkIn = async (userId: string) => {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("User not found", 404);

    if (!this.allowedRolesForAttendance.includes(user.role)) {
      throw new ApiError(
        "Only workers, drivers, or outlet admins can check-in",
        403
      );
    }

    // prevent multiple open check-ins for same day (server timezone)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId: userId,
        checkIn: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { checkIn: "desc" },
    });

    if (existing && !existing.checkOut) {
      throw new ApiError(
        "Already checked-in for today and not checked-out",
        400
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        userId: userId,
        checkIn: new Date(),
      },
    });

    return attendance;
  };

  // POST /attendance/check-out
  checkOut = async (userId: string) => {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("User not found", 404);

    if (!this.allowedRolesForAttendance.includes(user.role)) {
      throw new ApiError(
        "Only workers, drivers, or outlet admins can check-out",
        403
      );
    }

    const attendance = await this.prisma.attendance.findFirst({
      where: { userId: userId, checkOut: null },
      orderBy: { checkIn: "desc" },
    });

    if (!attendance) {
      throw new ApiError("No active attendance to check-out", 400);
    }

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut: new Date() },
    });

    return updated;
  };

  // GET /attendance/log?from=&to=&userId=
  getUserAttendanceLog = async (userId: string, dto?: GetAttendanceLogDTO) => {
    const where: any = { userId };

    if (dto?.from || dto?.to) {
      where.checkIn = {};
      if (dto.from) where.checkIn.gte = new Date(dto.from);
      if (dto.to) where.checkIn.lte = new Date(dto.to);
    }

    const list = await this.prisma.attendance.findMany({
      where,
      orderBy: { checkIn: "desc" },
    });

    return list;
  };

  // GET /attendance/report?outletId=&from=&to=
  // Now includes workers, drivers, AND outlet admins that belong to the outlet.
  getOutletAttendanceReport = async (dto: GetAttendanceReportDTO) => {
    const from = dto.from
      ? new Date(dto.from)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          return d;
        })();
    const to = dto.to ? new Date(dto.to) : new Date();

    // find users (workers + drivers + outlet admins) for this outlet
    // include:
    //  - users who have user.outletId === outletId (admins / staff)
    //  - users who have workers for that outlet (workers)
    //  - users who are drivers in Driver table for that outlet (drivers)
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: this.allowedRolesForAttendance },
        OR: [
          { outletId: dto.outletId },
          {
            workers: {
              some: { outletId: dto.outletId },
            },
          },
          {
            drivers: {
              some: { outletId: dto.outletId },
            },
          },
        ],
      },
      select: { id: true, name: true, email: true },
    });

    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      return { from, to, outletId: dto.outletId, report: [] };
    }

    // fetch attendances for those users in range
    const attendances = await this.prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        checkIn: { gte: from, lte: to },
      },
      include: { user: true },
      orderBy: { checkIn: "desc" },
    });

    // aggregate by userId
    const grouped: Record<
      string,
      { user: any; totalDays: number; records: any[]; totalHours: number }
    > = {};
    for (const a of attendances) {
      if (!grouped[a.userId])
        grouped[a.userId] = {
          user: a.user,
          totalDays: 0,
          records: [],
          totalHours: 0,
        };
      grouped[a.userId].records.push(a);
      grouped[a.userId].totalDays += 1;
      if (a.checkOut) {
        const diffMs = a.checkOut.getTime() - a.checkIn.getTime();
        grouped[a.userId].totalHours += diffMs / (1000 * 60 * 60);
      }
    }

    const result = Object.values(grouped).map((g) => ({
      user: { id: g.user.id, name: g.user.name, email: g.user.email },
      totalDays: g.totalDays,
      totalHours: Number(g.totalHours.toFixed(2)),
      records: g.records,
    }));

    return { from, to, outletId: dto.outletId, report: result };
  };

  // helper: last attendance for user
  getLastAttendance = async (userId: string) => {
    return this.prisma.attendance.findFirst({
      where: { userId },
      orderBy: { checkIn: "desc" },
    });
  };
}
