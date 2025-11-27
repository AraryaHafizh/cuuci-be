import { PrismaService } from "../../prisma/prisma.service";

export class OrderService {
    private prisma: PrismaService;


    constructor () {
        this.prisma = new PrismaService();
    }

    getOrders = async () => {}

    getOrderDetails = async () => {}

    updateOrderStatus = async () => {}

    createDeliveryRequest = async () => {}

    confirmOrder = async () => {}

    autoConfirmOrder = async () => {}

    // maybe cron automation??
    // autoCancelUnpaidOrders
    // autoConfirmDeliveredOrders
}