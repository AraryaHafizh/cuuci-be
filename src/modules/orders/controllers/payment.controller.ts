import { PrismaService } from "../../prisma/prisma.service";

export class PaymentController {
    private prisma: PrismaService;

    constructor () {
        this.prisma = new PrismaService();
    }
}