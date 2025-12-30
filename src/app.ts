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
import { DriverRouter } from "./modules/drivers/driver.router";
import { WorkerRouter } from "./modules/workers/worker.router";
import { CustomerRouter } from "./modules/customers/customer.router";
import { NotificationRouter } from "./modules/notifications/notification.router";
import { Addressrouter } from "./modules/addresses/address.router";

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
    const addressRouter = new Addressrouter();
    const userUpdaterouter = new UserUpdateRouter();
    const attendanceRouter = new AttendanceRouter();
    const outletRouter = new OutletRouter();
    const orderRouter = new OrderRouter();
    const driverRouter = new DriverRouter();
    const workerRouter = new WorkerRouter();
    const customerRouter = new CustomerRouter();
    const notificationRouter = new NotificationRouter();

    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/addresses", addressRouter.getRouter());
    this.app.use("/users", userUpdaterouter.getRouter());
    this.app.use("/attendances", attendanceRouter.getRouter());
    this.app.use("/outlets", outletRouter.getRouter());
    this.app.use("/orders", orderRouter.getRouter());
    this.app.use("/drivers", driverRouter.getRouter());
    this.app.use("/workers", workerRouter.getRouter());
    this.app.use("/customers", customerRouter.getRouter());
    this.app.use("/notifications", notificationRouter.getRouter());
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
