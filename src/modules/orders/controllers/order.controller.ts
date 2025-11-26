import { PrismaService } from "../../prisma/prisma.service";

export class OrderController {
    private prisma: PrismaService;

    constructor () {
        this.prisma = new PrismaService();
    }
}