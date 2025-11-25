import { PrismaService } from "../prisma/prisma.service";

export class OrderService {
    private prisma: PrismaService;


    constructor () {
        this.prisma = new PrismaService();
    }

    getPickupOrders = async () => {}

    getOrderDetails = async () => {}

    confirmOrder = async () => {}

    createCostumerPickupOrder = async () => {}

    createOutletPickupOrder = async () => {}

    createOrderPayment = async () => {}

}