import { Request, Response } from "express";
import { UserUpdateService } from "./user.service";
import { plainToInstance } from "class-transformer";
import { Users } from "./dto/users.dto";

export class UserUpdateController {
  private userUpdateservice: UserUpdateService;

  constructor() {
    this.userUpdateservice = new UserUpdateService();
  }

  getUsers = async (req: Request, res: Response) => {
    const query = plainToInstance(Users, req.query);
    const result = await this.userUpdateservice.getUsers(query);
    res.status(200).send(result);
  };

  getUser = async (req: Request, res: Response) => {
    const id = req.params.id;
    const query = plainToInstance(Users, req.query);
    const result = await this.userUpdateservice.getUser(id, query);
    res.status(200).send(result);
  };

  userUpdate = async (req: Request, res: Response) => {
    const userId = req.params.id;
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const profilePictureUrl = files?.profilePictureUrl?.[0];
    const result = await this.userUpdateservice.userUpdate(
      userId,
      body,
      profilePictureUrl
    );
    res.status(200).send(result);
  };

  userUpdatePassword = async (req: Request, res: Response) => {
    const { id: userId } = res.locals.user;
    const body = req.body;
    const result = await this.userUpdateservice.userUpdatePassword(
      userId,
      body
    );
    res.status(200).send(result);
  };

  deleteUser = async (req: Request, res: Response) => {
    const userId = req.params.id;
    const result = await this.userUpdateservice.deleteUser(userId);
    res.status(200).send(result);
  };
}
