import { CreateDTO } from "./dto/create.dto";
import { LaundryService } from "./laundry.service";

export class LaundryContorller {
  private laundryService: LaundryService;

  constructor() {
    this.laundryService = new LaundryService();
  }
  getLaundryItems = async (req: any, res: any) => {
    const result = await this.laundryService.getLaundryItems();
    res.status(200).send(result);
  };
  createLaundryItem = async (req: any, res: any) => {
    const body = req.body as CreateDTO;
    const result = await this.laundryService.createLaundryItem(body);
    res.status(200).send(result);
  };
  deleteLaundryItem = async (req: any, res: any) => {
    const id = req.params.id;
    const result = await this.laundryService.deleteLaundryItem(id);
    res.status(200).send(result);
  };
}
