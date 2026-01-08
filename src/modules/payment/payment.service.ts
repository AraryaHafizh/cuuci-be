import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { xenditClient } from "../xendit/xendit";


export class PaymentService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createPayment = async (orderId: string) => {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: true,
      },
    });

    if (!order) throw new ApiError("Order not found", 404);
    if (order.status !== "ARRIVED_AT_OUTLET") {
      throw new ApiError("Order is not ready for payment", 400);
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment && existingPayment.status === "PENDING") {
      return {
        message: "Payment already created",
        data: existingPayment,
      };
    }

    // Create Xendit invoice
    const invoice = await xenditClient.Invoice.createInvoice({
      data: {
        externalId: orderId,
        amount: order.totalPrice,
        payerEmail: order.customer.email,
        description: `Payment for Order #${order.orderNumber}`,
        invoiceDuration: 86400, // 24 hours in seconds
        successRedirectUrl: `${process.env.BASE_URL_FE}/orders/${orderId}/payment/success`,
        failureRedirectUrl: `${process.env.BASE_URL_FE}/orders/${orderId}/payment/failed`,
      },
    });

    // Save payment to database
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: order.totalPrice,
        status: "PENDING",
        method: "XENDIT",
        invoiceNumber: order.orderNumber,
        externalId: invoice.id,
        invoiceUrl: invoice.invoiceUrl,
        expiresAt: new Date(invoice.expiryDate),
      },
    });

    return {
      message: "Payment created successfully",
      data: {
        paymentId: payment.id,
        invoiceUrl: invoice.invoiceUrl,
        amount: order.totalPrice,
        expiresAt: payment.expiresAt,
      },
    };
  };

  handleWebhook = async (body: any) => {
    // Verify webhook signature
    const callbackToken = body.callback_authentication_token;
    if (callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
      throw new ApiError("Invalid callback token", 401);
    }

    const externalId = body.external_id; // This is your orderId
    const status = body.status; // PAID, EXPIRED, etc.

    const payment = await this.prisma.payment.findFirst({
    //   where: { externalId: body.id },
      include: { order: true },
    });

    if (!payment) {
      console.log("Payment not found for external ID:", body.id);
      return { message: "Payment not found" };
    }

    // Update payment status
    if (status === "PAID") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          paidAt: new Date(body.paid_at),
        },
      });

      // Update order status to ready for delivery
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: "READY_FOR_DELIVERY",
        },
      });

      // Send notification to customer
    //   await notificationService.sendPaymentSuccess(payment.order);
    } else if (status === "EXPIRED") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }

    return { message: "Webhook processed" };
  };

  getPaymentDetails = async (orderId: string, customerId: string) => {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!payment) throw new ApiError("Payment not found", 404);
    if (payment.order.customerId !== customerId) {
      throw new ApiError("Unauthorized", 403);
    }

    return {
      message: "Payment details fetched",
      data: payment,
    };
  };
}
