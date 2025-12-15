import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { WorkerService } from "./worker.service";

export class WorkerContorller {
  private workerService: WorkerService;

  constructor() {
    this.workerService = new WorkerService();
  }
}
