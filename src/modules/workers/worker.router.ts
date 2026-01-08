import { Router } from "express";
import { JWT_SECRET } from "../../config/env";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { WorkerContorller } from "./worker.controller";
import { validateBody } from "../../middlewares/validation.middleware";
import { ValidateDTO } from "./dto/validate.dto";

export class WorkerRouter {
  private router: Router;
  private workerController: WorkerContorller;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.workerController = new WorkerContorller();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.workerController.getWorkers
    );
    this.router.get(
      "/jobs",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["WORKER"]),
      this.workerController.getJobs
    );
    this.router.post(
      "/jobs/take/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["WORKER"]),
      this.workerController.takeJob
    );
    this.router.post(
      "/jobs/bypass/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["WORKER"]),
      this.workerController.requestBypass
    );
    this.router.post(
      "/jobs/finish/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["WORKER"]),
      // validateBody(ValidateDTO),
      this.workerController.finishJob
    );
    this.router.get(
      "/jobs/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["WORKER"]),
      this.workerController.getJobDetail
    );
    this.router.get(
      "/history",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["WORKER"]),
      this.workerController.getJobsHistory
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET!),
      this.jwtMiddleware.verifyRole(["SUPER_ADMIN", "OUTLET_ADMIN"]),
      this.workerController.getWorker
    );
  };
  getRouter = () => {
    return this.router;
  };
}
