import { SampleController } from "./sample.controller";
import { Router } from "express";

export class SampleRoute {
  private router: Router;
  private sampleController: SampleController;

  constructor() {
    this.router = Router();
    this.sampleController = new SampleController();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get("/", this.sampleController.getSamples);
    this.router.get("/:id", this.sampleController.getSample);
  };

  getRouter = () => {
    return this.router;
  };
}
