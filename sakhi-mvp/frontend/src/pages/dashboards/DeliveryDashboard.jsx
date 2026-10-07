import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  ChevronDown,
  MapPin,
  Package,
  Store,
  Users,
} from "lucide-react";

import DashboardLayout from "./DashboardLayout";
import StatCard from "./StatCard";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import RouteStrip from "../../components/RouteStrip";
import Toast from "../../components/Toast";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { FLOW, STAGE_LABEL, stageIndex } from "../../data/delivery";

const PICKUP_ACTIONS = [
  ["PENDING", "READY_FOR_PICKUP", "Start pickup"],
  ["READY_FOR_PICKUP", "PICKED_UP", "Confirm pickup"],
  ["PICKED_UP", "AT_COLLECTION", "Mark at collection"],
];

const LAST_MILE_ACTIONS = [
  ["AT_DESTINATION", "OUT_FOR_DELIVERY", "Receive & start last mile"],
  ["OUT_FOR_DELIVERY", "DELIVERED", "Mark delivered"],
];

const WAVE_ORDER = ["INSTANT", "2:00 PM", "5:00 PM"];

const sellerReady = (delivery) =>
  delivery.order?.orderStatus === "READY_FOR_PICKUP";

/*
 * MongoDB IDs can arrive as strings, objects or ObjectIds
 * depending on how the backend serializes them.
 *
 * Converting both values to strings makes assignment
 * checking reliable.
 */
function sameId(first, second) {
  if (!first || !second) {
    return false;
  }

  const firstId =
    typeof first === "object" && first.toString
      ? first.toString()
      : String(first);

  const secondId =
    typeof second === "object" && second.toString
      ? second.toString()
      : String(second);

  return firstId === secondId;
}

/*
 * Create batches from the delivery records returned
 * by the backend.
 */
function groupBatches(deliveries, currentUserId) {
  const map = new Map();

  for (const delivery of deliveries) {
    const batchId = delivery.batchId || `ORDER-${delivery._id}`;

    if (!map.has(batchId)) {
      map.set(batchId, {
        batchId,
        wave: delivery.wave || "INSTANT",
        waveDate: delivery.waveDate || new Date().toISOString().slice(0, 10),

        destinationStop:
          delivery.destinationStop ||
          delivery.order?.destination ||
          "Local delivery",

        collectionPoint: delivery.collectionPoint || "Local collection point",

        items: [],
      });
    }

    map.get(batchId).items.push(delivery);
  }

  return [...map.values()].map((batch) => {
    const live = batch.items.filter(
      (delivery) => delivery.status !== "CANCELLED",
    );

    const stage = live.length
      ? FLOW[Math.min(...live.map((delivery) => stageIndex(delivery.status)))]
      : "CANCELLED";

    const pickupMine = live.filter((delivery) =>
      sameId(delivery.pickupPartnerId, currentUserId),
    );

    const lastMileMine = live.filter((delivery) =>
      sameId(delivery.lastMilePartnerId, currentUserId),
    );

    const pickupPartner = batch.items.find(
      (delivery) => delivery.pickupPartner,
    )?.pickupPartner;

    const lastMilePartner = batch.items.find(
      (delivery) => delivery.lastMilePartner,
    )?.lastMilePartner;

    return {
      ...batch,
      live,
      stage,

      sellers: new Set(
        live.map((delivery) => delivery.sellerId?.toString()).filter(Boolean),
      ).size,

      pickupMine,
      lastMileMine,

      pickupPartner,
      lastMilePartner,
    };
  });
}

/*
 * Find the next action available for this partner.
 */
function batchAction(mine, actions) {
  for (const [from, to, label] of actions) {
    const here = mine.filter((delivery) => delivery.status === from);

    if (!here.length) {
      continue;
    }

    /*
     * Pickup confirmation requires the seller
     * to have marked the order ready.
     */
    if (to === "PICKED_UP") {
      const ready = here.filter(sellerReady);

      if (ready.length) {
        return {
          to,
          label,
          count: ready.length,
        };
      }

      return {
        waiting: `Waiting for ${here.length} seller(s) to finish preparing`,
      };
    }

    return {
      to,
      label,
      count: here.length,
    };
  }

  return null;
}

/*
 * Find the next action for one individual package.
 */
function packageAction(delivery, currentUserId) {
  const pickupActions = sameId(delivery.pickupPartnerId, currentUserId)
    ? PICKUP_ACTIONS
    : [];

  const lastMileActions = sameId(delivery.lastMilePartnerId, currentUserId)
    ? LAST_MILE_ACTIONS
    : [];

  const action = [...pickupActions, ...lastMileActions].find(
    ([from]) => from === delivery.status,
  );

  if (!action) {
    return null;
  }

  /*
   * Seller must be ready before pickup.
   */
  if (action[1] === "PICKED_UP" && !sellerReady(delivery)) {
    return null;
  }

  return {
    to: action[1],
    label: action[2],
  };
}

export default function DeliveryDashboard() {
  const { user } = useAuth();

  const [deliveries, setDeliveries] = useState([]);

  const [loaded, setLoaded] = useState(false);

  const [open, setOpen] = useState({});

  const [toast, setToast] = useState(null);

  const closeToast = useCallback(() => setToast(null), []);

  /*
   * Load all delivery records from backend.
   */
  const load = useCallback(async () => {
    try {
      setLoaded(false);

      const data = await api.deliveries();

      /*
       * Be defensive in case the backend returns
       * an unexpected response shape.
       */
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.deliveries)
          ? data.deliveries
          : [];

      setDeliveries(list);
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Unable to load deliveries.",
      });

      setDeliveries([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Run an API operation and reload the dashboard.
   */
  const run = async (fn, successMessage) => {
    try {
      const result = await fn();

      if (successMessage) {
        setToast({
          message: successMessage(result),
        });
      }

      await load();
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Something went wrong.",
      });
    }
  };

  /*
   * Ask the delivery partner to take a package photo.
   */
  const choosePhoto = () =>
    new Promise((resolve) => {
      const input = document.createElement("input");

      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";

      input.onchange = () => {
        resolve(input.files?.[0] || null);
      };

      input.click();
    });

  /*
   * Move an entire batch to the next stage.
   */
  const moveBatch = async (batch, to) => {
    /*
     * Only PICKED_UP requires package photos.
     */
    if (to !== "PICKED_UP") {
      return run(
        () => api.updateBatchStatus(batch.batchId, to),

        (result) =>
          `${result.updated} package(s) moved to ${STAGE_LABEL[to]}${
            result.skipped ? `, ${result.skipped} skipped` : ""
          }`,
      );
    }

    const ready = batch.pickupMine.filter(
      (delivery) =>
        delivery.status === "READY_FOR_PICKUP" && sellerReady(delivery),
    );

    if (!ready.length) {
      setToast({
        type: "error",
        message: "No package is ready for pickup.",
      });

      return;
    }

    try {
      /*
       * Every package needs its own pickup photo.
       */
      for (const delivery of ready) {
        const file = await choosePhoto();

        if (!file) {
          throw new Error("Pickup photo is required for every package.");
        }

        const form = new FormData();

        form.append("photo", file);

        await api.uploadPackagePhoto(delivery._id, form);
      }

      const result = await api.updateBatchStatus(batch.batchId, to);

      setToast({
        message:
          `${result.updated} package(s) picked up ` + "with package photos.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Unable to complete pickup.",
      });
    }

    await load();
  };

  /*
   * Move one package.
   */
  const movePackage = async (delivery, to) => {
    /*
     * Pickup requires a package photo.
     */
    if (to === "PICKED_UP") {
      try {
        const file = await choosePhoto();

        if (!file) {
          throw new Error("Pickup photo is required before pickup.");
        }

        const form = new FormData();

        form.append("photo", file);

        await api.uploadPackagePhoto(delivery._id, form);
      } catch (error) {
        setToast({
          type: "error",
          message: error.message,
        });

        return;
      }
    }

    await run(
      () => api.updateDelivery(delivery._id, { status: to }),

      () => `Package moved to ${STAGE_LABEL[to]}`,
    );
  };

  const currentUserId = user?.id || user?._id;

  const batches = groupBatches(deliveries, currentUserId).sort((a, b) => {
    const dateA = a.waveDate || "";

    const dateB = b.waveDate || "";

    const dateCompare = dateA.localeCompare(dateB);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    const waveA = WAVE_ORDER.indexOf(a.wave);

    const waveB = WAVE_ORDER.indexOf(b.wave);

    if (waveA !== waveB) {
      return waveA - waveB;
    }

    return a.batchId.localeCompare(b.batchId);
  });

  const active = batches.filter(
    (batch) => !["DELIVERED", "CANCELLED"].includes(batch.stage),
  );

  const waves = [
    ...new Set(batches.map((batch) => `${batch.waveDate}|${batch.wave}`)),
  ];

  return (
    <DashboardLayout
      eyebrow="Delivery dashboard"
      title="Today's delivery waves"
      subtitle="View orders, batches and delivery assignments."
    >
      <Toast toast={toast} onClose={closeToast} />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active batches" value={active.length} icon={Boxes} />

        <StatCard
          label="Packages"
          value={
            deliveries.filter((delivery) => delivery.status !== "CANCELLED")
              .length
          }
          icon={Package}
        />

        <StatCard
          label="As pickup partner"
          value={batches.filter((batch) => batch.pickupMine.length > 0).length}
          icon={Store}
        />

        <StatCard
          label="As last-mile partner"
          value={
            batches.filter((batch) => batch.lastMileMine.length > 0).length
          }
          icon={MapPin}
        />
      </div>

      {/* Empty state */}
      {loaded && !batches.length && (
        <Card className="mt-6 p-10 text-center">
          <Boxes size={32} className="mx-auto text-sakhi-500" />

          <h2 className="mt-3 font-bold">No delivery orders yet</h2>

          <p className="mt-1 text-sm text-slate-500">
            New customer orders will appear here when they are added to a
            delivery wave.
          </p>
        </Card>
      )}

      {/* Delivery waves */}
      {waves.map((key) => {
        const [date, wave] = key.split("|");

        const waveBatches = batches.filter(
          (batch) => batch.waveDate === date && batch.wave === wave,
        );

        return (
          <section className="mt-8" key={key}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-sakhi-700">
              {wave} wave
              <span className="font-medium normal-case text-slate-400">
                {" "}
                · {date}
              </span>
            </h2>

            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {waveBatches.map((batch) => {
                const pickup = batchAction(batch.pickupMine, PICKUP_ACTIONS);

                const lastMile = batchAction(
                  batch.lastMileMine,
                  LAST_MILE_ACTIONS,
                );

                const action = pickup || lastMile;

                const done = ["DELIVERED", "CANCELLED"].includes(batch.stage);

                const hasAssignment =
                  batch.pickupMine.length > 0 || batch.lastMileMine.length > 0;

                return (
                  <Card
                    className={`p-5 ${done ? "opacity-70" : ""}`}
                    key={batch.batchId}
                  >
                    {/* Batch header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Batch</p>

                        <h3 className="text-lg font-bold">{batch.batchId}</h3>

                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                          <MapPin size={14} />

                          {batch.destinationStop}
                        </p>
                      </div>

                      <StatusBadge status={batch.stage} />
                    </div>

                    {/* Batch stats */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <Package size={14} className="text-sakhi-600" />

                        <b className="mt-1 block">{batch.live.length}</b>

                        <span className="text-xs text-slate-500">Packages</span>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <Users size={14} className="text-sakhi-600" />

                        <b className="mt-1 block">{batch.sellers}</b>

                        <span className="text-xs text-slate-500">Sellers</span>
                      </div>
                    </div>

                    {/* Delivery route */}
                    <div className="mt-5">
                      <RouteStrip status={batch.stage} />
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Collection point: {batch.collectionPoint}. Mid-mile is
                      simulated in this MVP.
                    </p>

                    {/* Assignment information */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {batch.pickupMine.length > 0 && (
                        <span className="rounded-full bg-sakhi-50 px-2.5 py-1 font-semibold text-sakhi-700">
                          You: pickup partner
                        </span>
                      )}

                      {batch.lastMileMine.length > 0 && (
                        <span className="rounded-full bg-sakhi-50 px-2.5 py-1 font-semibold text-sakhi-700">
                          You: last-mile partner
                        </span>
                      )}

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        Pickup:{" "}
                        {batch.pickupPartner || "Waiting for assignment"}
                      </span>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        Last mile:{" "}
                        {batch.lastMilePartner || "Waiting for assignment"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpen((current) => ({
                            ...current,
                            [batch.batchId]: !current[batch.batchId],
                          }))
                        }
                        className="btn-secondary !py-1.5 text-xs"
                      >
                        View orders
                        <ChevronDown
                          size={14}
                          className={`ml-1 inline transition ${
                            open[batch.batchId] ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {action?.to && (
                        <button
                          type="button"
                          onClick={() => moveBatch(batch, action.to)}
                          className="btn-primary !py-1.5 text-xs"
                        >
                          {action.label} ({action.count})
                        </button>
                      )}

                      {action?.waiting && (
                        <span className="text-xs text-amber-700">
                          {action.waiting}
                        </span>
                      )}

                      {!action && !done && hasAssignment && (
                        <span className="text-xs text-slate-500">
                          Nothing for you to do at this stage.
                        </span>
                      )}

                      {!action && !done && !hasAssignment && (
                        <span className="text-xs font-medium text-amber-700">
                          Waiting for admin assignment.
                        </span>
                      )}
                    </div>

                    {/* Individual orders */}
                    {open[batch.batchId] && (
                      <div className="mt-4 overflow-hidden divide-y rounded-xl border border-slate-100">
                        {batch.items.map((delivery) => {
                          const next = packageAction(delivery, currentUserId);

                          const order = delivery.order;

                          const seller = delivery.seller;

                          return (
                            <div className="p-4" key={delivery._id}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">
                                      Order #
                                      {delivery.orderId
                                        ?.toString()
                                        .slice(-6)
                                        .toUpperCase()}
                                    </p>

                                    <StatusBadge status={delivery.status} />
                                  </div>

                                  <p className="mt-1 text-sm font-medium text-slate-700">
                                    {seller?.businessName || "Seller"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {order?.items
                                      ?.map(
                                        (item) =>
                                          `${item.name} × ${item.quantity}`,
                                      )
                                      .join(", ") ||
                                      "Order details unavailable"}
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                    <span>
                                      Amount: ₹{order?.totalAmount ?? "—"}
                                    </span>

                                    <span>
                                      Pickup:{" "}
                                      {delivery.pickupArea ||
                                        seller?.location ||
                                        "—"}
                                    </span>

                                    <span>
                                      Destination:{" "}
                                      {delivery.destinationStop ||
                                        order?.destination ||
                                        "—"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  {next && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        movePackage(delivery, next.to)
                                      }
                                      className="btn-secondary !px-3 !py-1 text-xs"
                                    >
                                      {next.label}
                                    </button>
                                  )}

                                  {!next &&
                                    !sameId(
                                      delivery.pickupPartnerId,
                                      currentUserId,
                                    ) &&
                                    !sameId(
                                      delivery.lastMilePartnerId,
                                      currentUserId,
                                    ) && (
                                      <span className="text-xs text-slate-400">
                                        Not assigned
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </DashboardLayout>
  );
}
