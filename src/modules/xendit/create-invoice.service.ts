import axios from "axios";
import { XENDIT_SECRET_KEY } from "../../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentRequestDTO } from "./dto/payment.request.dto";
import { PaymentResponseDTO } from "./dto/payment.response.dto";

export class CreateInvoiceXendit {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  private authToken = Buffer.from(XENDIT_SECRET_KEY!).toString("base64");
  createInvoice = async (body: PaymentRequestDTO) => {
    const { data } = await axios.post<PaymentResponseDTO>(
      "https://api.xendit.co/v2/invoices",
      body,
      {
        headers: {
          Authorization: `Basic ${this.authToken}`,
        },
      }
    );
    return data;
  };

}
