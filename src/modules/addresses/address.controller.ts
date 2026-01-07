import { Request, Response } from "express";
import { AddressService } from "./address.service";
import { updateDTO } from "./dto/edit.dto";
import { createDTO } from "./dto/create.dto";
import { plainToInstance } from "class-transformer";
import { GetAddressDTO } from "./dto/get-order.dto";

export class AddressController {
  private addressService: AddressService;

  constructor() {
    this.addressService = new AddressService();
  }

  getAddresses = async (req: Request, res: Response) => {
    const id = String(res.locals.user.id);
    const query = plainToInstance(GetAddressDTO, req.query);
    const result = await this.addressService.getAddresses(id, query);
    res.status(200).send(result);
  };

  createAddress = async (req: Request, res: Response) => {
    const userId = String(res.locals.user.id);
    const payload = req.body as createDTO;
    const result = await this.addressService.createAddress(payload, userId);
    res.status(201).send(result);
  };

  updateAddress = async (req: Request, res: Response) => {
    const id = req.params.id;
    const userId = String(res.locals.user.id);
    const payload = req.body as updateDTO;
    const result = await this.addressService.updateAddress(id, userId, payload);
    res.status(200).send(result);
  };

  deleteAddress = async (req: Request, res: Response) => {
    const id = req.params.id;
    const userId = String(res.locals.user.id);
    const result = await this.addressService.deleteAddress(id, userId);
    res.status(200).send(result);
  };

  setPrimaryAddress = async (req: Request, res: Response) => {
    const id = req.params.id;
    const userId = String(res.locals.user.id);
    const result = await this.addressService.setPrimaryAddress(id, userId);
    res.status(200).send(result);
  };
}
