export const FLOW = ["PENDING", "READY_FOR_PICKUP", "PICKED_UP", "AT_COLLECTION", "MID_MILE", "AT_DESTINATION", "OUT_FOR_DELIVERY", "DELIVERED"];

export const STAGE_LABEL = {
  PENDING: "Pending",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Picked up",
  AT_COLLECTION: "At collection point",
  MID_MILE: "Mid-mile",
  AT_DESTINATION: "At destination stop",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};

// The journey a package takes, shown as a route strip.
export const ROUTE_STOPS = [
  { key: "PICKED_UP", label: "Sakhi pickup" },
  { key: "AT_COLLECTION", label: "Collection point" },
  { key: "MID_MILE", label: "Mid-mile (proposed BRTS)" },
  { key: "AT_DESTINATION", label: "Destination stop" },
  { key: "DELIVERED", label: "Doorstep" }
];

export const stageIndex = (status) => FLOW.indexOf(status);
