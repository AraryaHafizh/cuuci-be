const PROCESS_FLOW = [
  "CREATED",
  "PICKUP",
  "WASHING",
  "IRONING",
  "PACKING",
  "DELIVERY",
] as const;

function mockLog(process: string) {
  return {
    process,
    status: process === "CREATED" ? "COMPLETED" : "PENDING",
    at: null,
    name: "",
    phoneNumber: "",
  };
}

export function buildOrderLog(order: any) {
  const createdLog = order?.createdAt
    ? [
        {
          process: "CREATED",
          status: "COMPLETED",
          at: order.createdAt,
          name: order.customer?.name ?? "",
          phoneNumber: order.customer?.phoneNumber ?? "",
        },
      ]
    : [];
  const pickupLogs =
    order.pickupOrders?.map((p: any) => ({
      process: "PICKUP",
      status: "COMPLETED",
      at: p.pickupAt,
      name: p.driver?.driver?.name ?? "",
      phoneNumber: p.driver?.driver?.phoneNumber ?? "",
      proofUrl: p.pickupProofUrl ?? "",
    })) ?? [];

  const workProcessLogs =
    order.orderWorkProcesses?.map((w: any) => ({
      process: w.station,
      status: w.status,
      at: w.completedAt ?? w.createdAt,
      name: w.worker?.worker?.name ?? "",
      phoneNumber: w.worker?.worker?.phoneNumber ?? "",
    })) ?? [];

  const deliveryLogs =
    order.deliveryOrders?.length > 0
      ? order.deliveryOrders.map((d: any) => ({
          process: "DELIVERY",
          status: d.status,
          at: d.updatedAt,
          name: d.driver?.driver?.name ?? "",
          phoneNumber: d.driver?.driver?.phoneNumber ?? "",
          deliveryNumber: d.deliveryNumber,
        }))
      : [];

  const allLogs = [
    ...createdLog,
    ...pickupLogs,
    ...workProcessLogs,
    ...deliveryLogs,
  ];

  const logMap = new Map<string, any>();
  for (const log of allLogs) {
    logMap.set(log.process, log);
  }

  const normalizedLogs = PROCESS_FLOW.map((process) => {
    return logMap.get(process) ?? mockLog(process);
  });

  return normalizedLogs;
}
