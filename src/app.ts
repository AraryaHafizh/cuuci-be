import express, { Express } from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import cors from "cors";
import { PORT } from "./config/env";
import { AuthRouter } from "./modules/auth/auth.router";
import { UserUpdateRouter } from "./modules/users/user.router";
import { DriverRouter } from "./modules/driver/driver.router";
import { WorkerRouter } from "./modules/worker/worker.router";
import { AttendanceRouter } from "./modules/attendances/attendance.router";

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
    const authRouter = new AuthRouter();
    const userUpdaterouter = new UserUpdateRouter();
    const attendanceRouter = new AttendanceRouter();
    const driverRouter = new DriverRouter();
    const workerRouter = new WorkerRouter(); // ✅ ADDED

    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/users", userUpdaterouter.getRouter());
    this.app.use("/attendance", attendanceRouter.getRouter());
    this.app.use("/driver", driverRouter.getRouter());
    this.app.use("/worker", workerRouter.getRouter()); // ✅ ADDED
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
