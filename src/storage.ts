import { useEffect, useState } from "react";
import { ROUTE_TEMPLATES, ROUTE_TEMPLATE_VESSELS } from "./routeTemplates";
import type { PortStop, Voyage } from "./types";

const STORAGE_KEY = "personnel-report-app-v1";
const SEED_FLAG_KEY = "personnel-report-app-route-seed-v7";

export interface StoreShape {
  voyages: Voyage[];
  portStops: PortStop[];
  hiddenVessels: string[];
}

const REMOVED_STOP_NAMES = new Set(["울목"]);

function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { voyages: [], portStops: [], hiddenVessels: [] };
    const parsed = JSON.parse(raw);
    const voyages: Voyage[] = (parsed.voyages ?? []).map((v: Voyage & { name?: string }) => ({
      ...v,
      initialVehicleCount: v.initialVehicleCount ?? 0,
      vessel: v.vessel ?? v.name ?? "기타",
      routeLabel: v.routeLabel ?? v.name ?? "",
    }));
    const portStops: PortStop[] = (parsed.portStops ?? []).map((p: PortStop) => ({
      ...p,
      vehicleBoarding: p.vehicleBoarding ?? 0,
      vehicleDisembarking: p.vehicleDisembarking ?? 0,
      destinationPassengerCounts: p.destinationPassengerCounts ?? {},
      destinationVehicleCounts: p.destinationVehicleCounts ?? {},
    }));
    const hiddenVessels: string[] = parsed.hiddenVessels ?? [];
    return { voyages, portStops, hiddenVessels };
  } catch {
    return { voyages: [], portStops: [], hiddenVessels: [] };
  }
}

function saveStore(store: StoreShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sortStops(a: PortStop, b: PortStop) {
  return a.order - b.order || a.createdAt - b.createdAt;
}

function migrateStore(current: StoreShape): StoreShape {
  let nextStore = current;

  const removedStops = nextStore.portStops.filter((stop) => REMOVED_STOP_NAMES.has(stop.name));
  if (removedStops.length > 0) {
    const removedByVoyageId = new Map<string, PortStop[]>();
    removedStops.forEach((stop) => {
      const bucket = removedByVoyageId.get(stop.voyageId) ?? [];
      bucket.push(stop);
      removedByVoyageId.set(stop.voyageId, bucket);
    });

    const keptPortStops = nextStore.portStops.filter((stop) => !REMOVED_STOP_NAMES.has(stop.name));
    const keptByVoyageId = new Map<string, PortStop[]>();
    keptPortStops.forEach((stop) => {
      const bucket = keptByVoyageId.get(stop.voyageId) ?? [];
      bucket.push(stop);
      keptByVoyageId.set(stop.voyageId, bucket);
    });

    const voyageIdsWithoutStops = new Set(
      [...removedByVoyageId.keys()].filter((voyageId) => (keptByVoyageId.get(voyageId) ?? []).length === 0)
    );

    const normalizedStopsById = new Map<string, PortStop>();
    keptByVoyageId.forEach((stops) => {
      [...stops].sort(sortStops).forEach((stop, index) => {
        normalizedStopsById.set(stop.id, stop.order === index + 1 ? stop : { ...stop, order: index + 1 });
      });
    });

    const voyages = nextStore.voyages.flatMap((voyage) => {
      if (voyageIdsWithoutStops.has(voyage.id)) return [];

      const remainingStops = keptByVoyageId.get(voyage.id);
      const deletedStops = removedByVoyageId.get(voyage.id);
      if (!remainingStops || !deletedStops) return [voyage];

      const sortedRemainingStops = [...remainingStops].sort(sortStops);
      const sortedDeletedStops = [...deletedStops].sort(sortStops);
      const nextRouteLabel = sortedRemainingStops.map((stop) => stop.name).join(" → ");
      const removedLeadingStop = sortedDeletedStops[0].order < sortedRemainingStops[0].order;
      const nextDepTime = removedLeadingStop
        ? sortedRemainingStops[0].plannedTime ?? voyage.depTime
        : voyage.depTime;

      if (voyage.routeLabel === nextRouteLabel && voyage.depTime === nextDepTime) {
        return [voyage];
      }

      return [{ ...voyage, routeLabel: nextRouteLabel, depTime: nextDepTime }];
    });

    const portStops = keptPortStops
      .filter((stop) => !voyageIdsWithoutStops.has(stop.voyageId))
      .map((stop) => normalizedStopsById.get(stop.id) ?? stop);

    nextStore = { voyages, portStops, hiddenVessels: nextStore.hiddenVessels };
  }

  const fixedLastSaeseom = nextStore.voyages.find(
    (voyage) =>
      voyage.vessel === "새섬두레" &&
      voyage.depTime === "14:30" &&
      !voyage.routeLabel.includes("관매")
  );

  if (!fixedLastSaeseom) return nextStore;

  const voyageStops = nextStore.portStops
    .filter((stop) => stop.voyageId === fixedLastSaeseom.id)
    .sort(sortStops);
  const hasGwanmae = voyageStops.some((stop) => stop.name === "관매");
  if (hasGwanmae) {
    return {
      voyages: nextStore.voyages.map((voyage) =>
        voyage.id === fixedLastSaeseom.id ? { ...voyage, routeLabel: "관매 → 창유 → 진도" } : voyage
      ),
      portStops: nextStore.portStops,
      hiddenVessels: nextStore.hiddenVessels,
    };
  }

  const insertedStop: PortStop = {
    id: crypto.randomUUID(),
    voyageId: fixedLastSaeseom.id,
    name: "관매",
    order: 1,
    boarding: 0,
    disembarking: 0,
    vehicleBoarding: 0,
    vehicleDisembarking: 0,
    destinationPassengerCounts: {},
    destinationVehicleCounts: {},
    createdAt: fixedLastSaeseom.createdAt,
  };

  const reorderedStops = nextStore.portStops.map((stop) =>
    stop.voyageId === fixedLastSaeseom.id ? { ...stop, order: stop.order + 1 } : stop
  );

  return {
    voyages: nextStore.voyages.map((voyage) =>
      voyage.id === fixedLastSaeseom.id ? { ...voyage, routeLabel: "관매 → 창유 → 진도" } : voyage
    ),
    portStops: [...reorderedStops, insertedStop],
    hiddenVessels: nextStore.hiddenVessels,
  };
}

function seedRouteTemplates(current: StoreShape): StoreShape {
  if (localStorage.getItem(SEED_FLAG_KEY)) return current;
  localStorage.setItem(SEED_FLAG_KEY, "1");

  // Remove any previously auto-seeded voyages before inserting the new full schedule,
  // so re-seeding doesn't duplicate entries. Voyages under a known vessel name, or whose
  // vessel field is a leftover "vessel · route" string from the old data shape, are
  // treated as prior seed output; anything else is a user-created voyage and is kept.
  const isOldSeed = (v: Voyage) =>
    v.seeded || ROUTE_TEMPLATE_VESSELS.includes(v.vessel) || v.vessel.includes(" · ");
  const seededIds = new Set(current.voyages.filter(isOldSeed).map((v) => v.id));
  const keptVoyages = current.voyages.filter((v) => !isOldSeed(v));
  const keptPortStops = current.portStops.filter((p) => !seededIds.has(p.voyageId));

  const now = Date.now();
  const newVoyages: Voyage[] = [];
  const newPortStops: PortStop[] = [];

  ROUTE_TEMPLATES.forEach((template, i) => {
    const voyage: Voyage = {
      id: crypto.randomUUID(),
      vessel: template.vessel,
      depTime: template.depTime,
      routeLabel: template.label,
      initialCount: 0,
      initialVehicleCount: 0,
      seeded: true,
      createdAt: now + i,
    };
    newVoyages.push(voyage);
    template.stops.forEach((stop, stopIndex) => {
      newPortStops.push({
        id: crypto.randomUUID(),
        voyageId: voyage.id,
        name: stop.name,
        order: stopIndex + 1,
        boarding: 0,
        disembarking: 0,
        vehicleBoarding: 0,
        vehicleDisembarking: 0,
        destinationPassengerCounts: {},
        destinationVehicleCounts: {},
        plannedTime: stop.time,
        createdAt: now + i,
      });
    });
  });

  return {
    voyages: [...keptVoyages, ...newVoyages],
    portStops: [...keptPortStops, ...newPortStops],
    hiddenVessels: current.hiddenVessels,
  };
}

type Listener = () => void;
const listeners = new Set<Listener>();
let store = seedRouteTemplates(loadStore());
store = migrateStore(store);
saveStore(store);

function setStore(updater: (prev: StoreShape) => StoreShape) {
  store = updater(store);
  saveStore(store);
  listeners.forEach((l) => l());
}

export function useStore(): [StoreShape, typeof setStore] {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return [store, setStore];
}

export function hideVessel(vessel: string) {
  setStore((prev) => ({
    voyages: prev.voyages.filter((v) => v.vessel !== vessel),
    portStops: prev.portStops.filter((p) => {
      const voyage = prev.voyages.find((v) => v.id === p.voyageId);
      return voyage?.vessel !== vessel;
    }),
    hiddenVessels: ROUTE_TEMPLATE_VESSELS.includes(vessel)
      ? [...new Set([...prev.hiddenVessels, vessel])]
      : prev.hiddenVessels,
  }));
}

export function resetToDefaults() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SEED_FLAG_KEY);
  store = migrateStore(seedRouteTemplates(loadStore()));
  saveStore(store);
  listeners.forEach((l) => l());
}
