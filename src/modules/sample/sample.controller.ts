import { Request, Response } from "express";
import { SampleService } from "./sample.service";

export class SampleController {
  private sampleService: SampleService;

  constructor() {
    this.sampleService = new SampleService();
  }

  getSamples = async (req: Request, res: Response) => {
    const samples = await this.sampleService.getSamples();
    res.json(samples);
  };

  getSample = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const sample = await this.sampleService.getSample(id);
    res.json(sample);
  };
}
