import express, { Express } from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import cors from "cors";
import { PORT } from "./config/env";
import { AuthRouter } from "./modules/auth/auth.router";
import { UserUpdateRouter } from "./modules/users/user.router";
import { AttendanceRouter } from "./modules/attendances/attendance.router";
import { OutletRouter } from "./modules/outlets/outlet.router";
import { initScheduler } from "./script";
import { OrderRouter } from "./modules/orders/order.router";

export class App {
  app: Express;
  
  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
    // initScheduler();
  }

  private configure() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private routes() {
    const authRouter = new AuthRouter();
    const userUpdaterouter = new UserUpdateRouter();
    const attendanceRouter = new AttendanceRouter();
    const outletRouter = new OutletRouter();
    const orderRouter = new OrderRouter();

    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/users", userUpdaterouter.getRouter());
    this.app.use("/attendances", attendanceRouter.getRouter());
    this.app.use("/outlets", outletRouter.getRouter());
    this.app.use("/orders", orderRouter.getRouter())
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
