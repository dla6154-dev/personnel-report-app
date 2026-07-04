import type { PortStop, Voyage } from "./types";

export interface DerivedVoyageStop {
  stop: PortStop;
  futureStops: PortStop[];
  passengerBoarding: number;
  passengerDisembarking: number;
  vehicleBoarding: number;
  vehicleDisembarking: number;
  runningTotal: number;
  runningVehicleTotal: number;
}

export function sortStops(a: PortStop, b: PortStop) {
  return a.order - b.order || a.createdAt - b.createdAt;
}

function hasDestinationEntries(
  counts: Record<string, number> | undefined,
  destinationIds: string[]
) {
  if (!counts) return false;
  return destinationIds.some((destinationId) => Object.hasOwn(counts, destinationId));
}

function sumDestinationCounts(
  counts: Record<string, number> | undefined,
  destinationIds: string[]
) {
  if (!counts) return 0;
  return destinationIds.reduce((total, destinationId) => total + (counts[destinationId] ?? 0), 0);
}

function getDisembarkTotalFromPreviousStops(
  previousStops: PortStop[],
  stopId: string,
  kind: "passenger" | "vehicle"
) {
  return previousStops.reduce((total, previousStop) => {
    const counts =
      kind === "passenger"
        ? previousStop.destinationPassengerCounts
        : previousStop.destinationVehicleCounts;
    return total + (counts?.[stopId] ?? 0);
  }, 0);
}

function hasDisembarkEntryFromPreviousStops(
  previousStops: PortStop[],
  stopId: string,
  kind: "passenger" | "vehicle"
) {
  return previousStops.some((previousStop) => {
    const counts =
      kind === "passenger"
        ? previousStop.destinationPassengerCounts
        : previousStop.destinationVehicleCounts;
    return counts ? Object.hasOwn(counts, stopId) : false;
  });
}

export function deriveVoyageStops(voyage: Voyage, rawStops: PortStop[]): DerivedVoyageStop[] {
  const stops = [...rawStops].sort(sortStops);
  let runningTotal = 0;
  let runningVehicleTotal = 0;

  return stops.map((stop, index) => {
    const previousStops = stops.slice(0, index);
    const futureStops = stops.slice(index + 1);
    const futureStopIds = futureStops.map((futureStop) => futureStop.id);

    const hasPassengerDestinations = hasDestinationEntries(
      stop.destinationPassengerCounts,
      futureStopIds
    );
    const hasVehicleDestinations = hasDestinationEntries(stop.destinationVehicleCounts, futureStopIds);

    const passengerBoarding = futureStops.length === 0
      ? 0
      : hasPassengerDestinations
        ? sumDestinationCounts(stop.destinationPassengerCounts, futureStopIds)
        : index === 0
          ? voyage.initialCount || stop.boarding
          : stop.boarding;
    const vehicleBoarding = futureStops.length === 0
      ? 0
      : hasVehicleDestinations
        ? sumDestinationCounts(stop.destinationVehicleCounts, futureStopIds)
        : index === 0
          ? voyage.initialVehicleCount || stop.vehicleBoarding
          : stop.vehicleBoarding;

    const passengerDisembarkFromDestinations = getDisembarkTotalFromPreviousStops(
      previousStops,
      stop.id,
      "passenger"
    );
    const vehicleDisembarkFromDestinations = getDisembarkTotalFromPreviousStops(
      previousStops,
      stop.id,
      "vehicle"
    );
    const hasPassengerDisembarkEntry = hasDisembarkEntryFromPreviousStops(
      previousStops,
      stop.id,
      "passenger"
    );
    const hasVehicleDisembarkEntry = hasDisembarkEntryFromPreviousStops(
      previousStops,
      stop.id,
      "vehicle"
    );

    const passengerDisembarking =
      index === 0
        ? 0
        : hasPassengerDisembarkEntry
          ? passengerDisembarkFromDestinations
          : stop.disembarking;
    const vehicleDisembarking =
      index === 0
        ? 0
        : hasVehicleDisembarkEntry
          ? vehicleDisembarkFromDestinations
          : stop.vehicleDisembarking;

    runningTotal = runningTotal - passengerDisembarking + passengerBoarding;
    runningVehicleTotal = runningVehicleTotal - vehicleDisembarking + vehicleBoarding;

    return {
      stop,
      futureStops,
      passengerBoarding,
      passengerDisembarking,
      vehicleBoarding,
      vehicleDisembarking,
      runningTotal,
      runningVehicleTotal,
    };
  });
}
