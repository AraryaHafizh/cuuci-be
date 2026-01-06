import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { WorkerService } from "./worker.service";
import { workers } from "./dto/workers.dto";
import { ValidateDTO } from "./dto/validate.dto";

export class WorkerContorller {
  private workerService: WorkerService;

  constructor() {
    this.workerService = new WorkerService();
  }

  getWorkers = async (req: Request, res: Response) => {
    const query = plainToInstance(workers, req.query);
    const result = await this.workerService.getWorkers(query);
    res.status(200).send(result);
  };

  getWorker = async (req: Request, res: Response) => {
    const driverId = req.params.id;
    const result = await this.workerService.getWorker(driverId);
    res.status(200).send(result);
  };

  getJobs = async (req: Request, res: Response) => {
    const workerId = String(res.locals.user.id);
    const result = await this.workerService.getJobs(workerId);
    res.status(200).send(result);
  };

  getJobDetail = async (req: Request, res: Response) => {
    const workerId = String(res.locals.user.id);
    const jobId = req.params.id;
    const result = await this.workerService.getJobDetail(workerId, jobId);
    res.status(200).send(result);
  };

  getJobsHistory = async (req: Request, res: Response) => {
    const workerId = String(res.locals.user.id);
    const result = await this.workerService.getJobsHistory(workerId);
    res.status(200).send(result);
  };

  takeJob = async (req: Request, res: Response) => {
    const jobId = req.params.id;
    const workerId = String(res.locals.user.id);
    const result = await this.workerService.takeJob(workerId, jobId);
    res.status(200).send(result);
  };

  // validateItems = async (req: Request, res: Response) => {
  //   const result = await this.workerService.validateItems();
  //   res.status(200).send(result);
  // };
  // requestBypass = async (req: Request, res: Response) => {
  //   const result = await this.workerService.requestBypass();
  //   res.status(200).send(result);
  // };

  requestBypass = async (req: Request, res: Response) => {
    const workerId = String(res.locals.user.id);
    const jobId = req.params.id;
    const note = req.body.note;
    const result = await this.workerService.requestBypass(
      workerId,
      jobId,
      note
    );
    res.status(200).send(result);
  };

  finishJob = async (req: Request, res: Response) => {
    const workerId = String(res.locals.user.id);
    const jobId = req.params.id;
    const body = req.body as ValidateDTO;
    const result = await this.workerService.finishJob(workerId, jobId, body);
    res.status(200).send(result);
  };
}
