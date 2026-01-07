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

  getOutletSummary = async (req: Request, res: Response) => {
    const outletId = res.locals.user;
    const result = await this.summaryService.getOutletSummary(outletId);

    res.status(200).send(result);
  };
}
