import { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { SummaryService } from "./summary.service";

export class SummaryController {
  private prisma: PrismaService;
  private summaryService: SummaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.summaryService = new SummaryService();
  }

  getMetrics = async (req: Request, res: Response) => {
    const userId = res.locals.user.id;
    const role = res.locals.user.role;
    const result = await this.summaryService.getMetrics(userId, role);

    res.status(200).send(result);
  };

  useOutletOverview = async (req: Request, res: Response) => {
    const result = await this.summaryService.useOutletOverview();
    res.status(200).send(result);
  };

  getOrderOverview = async (req: Request, res: Response) => {
    const userId = res.locals.user.id;
    const role = res.locals.user.role;
    const result = await this.summaryService.getOrderOverview(userId, role);
    res.status(200).send(result);
  };
}
