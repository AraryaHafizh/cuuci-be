import { Request, Response } from "express";
import { ReportService } from "./report.service";

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  getSalesReport = async (req: Request, res: Response) => {
    const user = res.locals.user;

    const result = await this.reportService.getSalesReport({
      role: user.role,
      outletId: user.outletId,
      from: new Date(req.query.from as string),
      to: new Date(req.query.to as string),
      groupBy: req.query.groupBy as "day" | "month" | "year",
    });

    res.status(200).send({
      message: "Sales report fetched",
      data: result,
    });
  };

  getEmployeePerformance = async (req: Request, res: Response) => {
  const user = res.locals.user;

  const result = await this.reportService.getEmployeePerformance({
    role: user.role,
    outletId: user.outletId,
    from: new Date(req.query.from as string),
    to: new Date(req.query.to as string),
  });

  res.status(200).send({
    message: "Employee performance report fetched",
    data: result,
  });
};
}
