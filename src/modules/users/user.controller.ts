import { Request, Response } from "express";
import { UserUpdateService } from "./user.service";

export class UserUpdateController {
  private userUpdateservice: UserUpdateService;

  constructor() {
    this.userUpdateservice = new UserUpdateService();
  }

  userUpdate = async (req: Request, res: Response) => {
    const id = req.params.id
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const profilePicture = files.profilePicture?.[0];
    const result = await this.userUpdateservice.userUpdate(id, body, profilePicture);
    res.status(200).send(result);
  };
}
