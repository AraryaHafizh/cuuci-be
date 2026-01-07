import { cancelUnpaidOrders } from "./autoCancelUnpaidOrders"
import { autoConfirmOrders } from "./autoConfirmDeliveredOrders"
import { autoDeleteUnverifiedUser } from "./autoDeleteUnverifiedUser"
import { paymentReminder } from "./sendPaymentReminder"

export const initScheduler = () => {
    // add other schedulers here
    autoDeleteUnverifiedUser.start()
    paymentReminder.start()
    cancelUnpaidOrders.start()
    autoConfirmOrders.start()
}