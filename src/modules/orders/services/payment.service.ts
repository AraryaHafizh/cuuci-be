import { PrismaService } from "../../prisma/prisma.service";

export class PaymentService {
    private prisma: PrismaService;

    constructor () {
        this.prisma = new PrismaService();
    }

    createInvoice = async () => {}

    handlePaymentCallback = async () => {}
}