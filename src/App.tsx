import { useState } from "react";
import VesselListScreen from "./screens/VesselListScreen";
import VoyageListScreen from "./screens/VoyageListScreen";
import VoyageDetailScreen from "./screens/VoyageDetailScreen";
import "./App.css";

export default function App() {
  const [openVessel, setOpenVessel] = useState<string | null>(null);
  const [openVoyageId, setOpenVoyageId] = useState<string | null>(null);

  return (
    <div className="app-root">
      {openVoyageId ? (
        <VoyageDetailScreen voyageId={openVoyageId} onBack={() => setOpenVoyageId(null)} />
      ) : openVessel ? (
        <VoyageListScreen
          vessel={openVessel}
          onBack={() => setOpenVessel(null)}
          onOpenVoyage={setOpenVoyageId}
        />
      ) : (
        <VesselListScreen onOpenVessel={setOpenVessel} />
      )}
    </div>
  );
}
