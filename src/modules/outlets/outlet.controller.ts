import { Request, Response } from "express";
import { OutletService } from "./outlet.service";
import { CreateDTO } from "./dto/create.dto";
import { nearestDTO } from "./dto/nearest.dto";

export class OutletController {
  private outletService: OutletService;

  constructor() {
    this.outletService = new OutletService();
  }

  getOutlets = async (req: Request, res: Response) => {
    const result = await this.outletService.getOutlets();
    res.status(200).send(result);
  };

  getOutlet = async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await this.outletService.getOutlet(id);
    res.status(200).send(result);
  };

  getNearestOutlet = async (req: Request, res: Response) => {
    const userId = String(res.locals.user.id);
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const result = await this.outletService.getNearestOutlet(
      userId,
      latitude,
      longitude
    );
    res.status(200).send(result);
  };

  createOutlet = async (req: Request, res: Response) => {
    const body = req.body as CreateDTO;
    const result = await this.outletService.createOutlet(body);
    res.status(200).send(result);
  };

  editOutlet = async (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body as CreateDTO;
    const result = await this.outletService.editOutlet(id, body);
    res.status(200).send(result);
  };

  removeOutlet = async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await this.outletService.removeOutlet(id);
    res.status(200).send(result);
  };
}
