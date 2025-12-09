// src/modules/attendance/attendance.service.ts
import { PrismaService } from "../prisma/prisma.service";
import { GetAttendanceLogDTO, GetAttendanceReportDTO } from "./dto/attendance.dto";
import { ApiError } from "../../utils/api-error";
import { Role } from "../../generated/prisma/enums";

export class AttendanceService {
  private prisma: PrismaService;

  private allowedRolesForAttendance: Role[] = [
    Role.WORKER,
    Role.DRIVER,
    Role.OUTLET_ADMIN,
  ];

  constructor() {
    this.prisma = new PrismaService();
  }


  checkIn = async (userId: string) => {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("User not found", 404);

    if (!this.allowedRolesForAttendance.includes(user.role)) {
      throw new ApiError(
        "Only workers, drivers, or outlet admins can check-in",
        403
      );
    }

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


getUserAttendanceLog = async (
  requesterUserId: string,
  page = 1,
  limit = 10,
  from?: string,
  to?: string
) => {

  const user = await this.prisma.user.findUnique({
    where: { id: requesterUserId },
  });
  if (!user) throw new ApiError("User not found", 404);

  const targetUserId = requesterUserId;
  const skip = (page - 1) * limit;

 
  const where: any = {
    userId: targetUserId,
    ...(from || to
      ? {
          checkIn: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };


  const [data, total] = await this.prisma.$transaction([
    this.prisma.attendance.findMany({
      skip,
      take: limit,
      where,
      orderBy: { checkIn: "desc" },
    }),
    this.prisma.attendance.count({ where }),
  ]);

  return {
    message: "Attendance log fetched successfully",
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  };
};



getOutletAttendanceReport = async (dto: {
  requesterId: string;
  outletId: string;
  page: number;
  limit: number;
  from?: string;
  to?: string;
}) => {
  const { requesterId, outletId, page, limit, from, to } = dto;


  const requester = await this.prisma.user.findUnique({
    where: { id: requesterId },
  });
  if (!requester) throw new ApiError("Unauthorized", 401);

 
  if (requester.role !== Role.OUTLET_ADMIN) {
    throw new ApiError("Only outlet admins may view attendance report", 403);
  }

  if (requester.outletId !== outletId) {
    throw new ApiError("Not authorized for this outlet", 403);
  }

 
  const skip = (page - 1) * limit;


  const dateFilter: any = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  
  const workersAndDrivers = await this.prisma.user.findMany({
    where: {
      role: { in: [Role.WORKER, Role.DRIVER] },
      outletId,
    },
    select: { id: true, name: true, email: true },
  });

  const userIds = workersAndDrivers.map((u) => u.id);
  if (userIds.length === 0) {
    return {
      message: "Attendance report fetched successfully",
      data: [],
      meta: { total: 0, page, limit, totalPages: 0, hasNext: false },
    };
  }

 
  const [records, total] = await this.prisma.$transaction([
    this.prisma.attendance.findMany({
      skip,
      take: limit,
      where: {
        userId: { in: userIds },
        ...(from || to ? { checkIn: dateFilter } : {}),
      },
      orderBy: { checkIn: "desc" },
      include: { user: true },
    }),
    this.prisma.attendance.count({
      where: {
        userId: { in: userIds },
        ...(from || to ? { checkIn: dateFilter } : {}),
      },
    }),
  ]);


  const grouped: Record<
    string,
    { user: any; totalDays: number; totalHours: number; records: any[] }
  > = {};

  for (const rec of records) {
    if (!grouped[rec.userId]) {
      grouped[rec.userId] = {
        user: rec.user,
        totalDays: 0,
        totalHours: 0,
        records: [],
      };
    }

    grouped[rec.userId].records.push(rec);
    grouped[rec.userId].totalDays++;

    if (rec.checkOut) {
      const diffMs = rec.checkOut.getTime() - rec.checkIn.getTime();
      grouped[rec.userId].totalHours += diffMs / 36e5; // ms → hours
    }
  }

  const result = Object.values(grouped).map((g) => ({
    user: {
      id: g.user.id,
      name: g.user.name,
      email: g.user.email,
    },
    totalDays: g.totalDays,
    totalHours: Number(g.totalHours.toFixed(2)),
    records: g.records,
  }));

  return {
    message: "Attendance report fetched successfully",
    data: result,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  };
};

 
  autoCheckoutExpiredAttendance = async () => {
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

   
    const active = await this.prisma.attendance.findMany({
      where: {
        checkOut: null,
        checkIn: { gte: startOfToday },
      },
      include: {
        user: true, 
      },
    });

    const updates = [];

    for (const record of active) {
     
      if (
        record.user.role !== Role.WORKER &&
        record.user.role !== Role.DRIVER
      ) {
        continue;
      }

      const scheduledEnd = new Date(record.checkIn);
      const hour = scheduledEnd.getHours();

      if (hour < 12) {
       
        scheduledEnd.setHours(12, 0, 0, 0);
      } else {
      
        scheduledEnd.setHours(23, 59, 59, 999);
      }

      if (now >= scheduledEnd) {
        updates.push(
          this.prisma.attendance.update({
            where: { id: record.id },
            data: { checkOut: scheduledEnd },
          })
        );
      }
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }

    return {
      message: "Expired attendance auto-checked-out",
      count: updates.length,
    };
  };


  
  getLastAttendance = async (userId: string) => {
    return this.prisma.attendance.findFirst({
      where: { userId },
      orderBy: { checkIn: "desc" },
    });
  };
}
