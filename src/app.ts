import express, { Express } from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import cors from "cors";
import { SampleRoute } from "./modules/sample/sample.route";
import { PORT } from "./config/env";

export class App {
  app: Express;
  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private routes() {
    const sampleRoute = new SampleRoute();

    this.app.use("/samples", sampleRoute.getRouter());
  }

  private handleError() {
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
}
