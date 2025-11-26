import { PrismaService } from "../../prisma/prisma.service";

export class PickupController {
    private prisma: PrismaService;

    constructor () {
        this.prisma = new PrismaService();
    }
}