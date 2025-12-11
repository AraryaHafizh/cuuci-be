import { Request, Response } from "express";
import { UserUpdateService } from "./user.service";
import { plainToInstance } from "class-transformer";
import { users } from "./dto/users.dto";

export class UserUpdateController {
  private userUpdateservice: UserUpdateService;

  constructor() {
    this.userUpdateservice = new UserUpdateService();
  }

  getUsers = async (req: Request, res: Response) => {
    const query = plainToInstance(users, req.query);
    const result = await this.userUpdateservice.getUsers(query);
    res.status(200).send(result);
  };

  getUser = async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await this.userUpdateservice.getUser(id);
    res.status(200).send(result);
  };

  userUpdate = async (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const profilePictureUrl = files.profilePictureUrl?.[0];
    const result = await this.userUpdateservice.userUpdate(
      id,
      body,
      profilePictureUrl
    );
    res.status(200).send(result);
  };

  userUpdatePassword = async (req: Request, res: Response) => {
    const id = req.params.id;
    const body = req.body;
    const result = await this.userUpdateservice.userUpdatePassword(id, body);
    res.status(200).send(result);
  };
}
