import { useState } from "react";
import { useStore, resetToDefaults } from "../storage";
import { ROUTE_TEMPLATE_VESSELS } from "../routeTemplates";
import ConfirmButton from "../components/ConfirmButton";

interface Props {
  onOpenVessel: (vessel: string) => void;
}

export default function VesselListScreen({ onOpenVessel }: Props) {
  const [store, setStore] = useStore();
  const [showForm, setShowForm] = useState(false);
  const [newVessel, setNewVessel] = useState("");

  const visibleTemplateVessels = ROUTE_TEMPLATE_VESSELS.filter(
    (v) => !store.hiddenVessels.includes(v)
  );
  const customVessels = [...new Set(store.voyages.map((v) => v.vessel))].filter(
    (v) => !ROUTE_TEMPLATE_VESSELS.includes(v)
  );
  const vessels = [...visibleTemplateVessels, ...customVessels.sort()];

  function voyageCountFor(vessel: string) {
    return store.voyages.filter((v) => v.vessel === vessel).length;
  }

  function createVessel() {
    const trimmed = newVessel.trim();
    if (!trimmed) return;
    setNewVessel("");
    setShowForm(false);
    onOpenVessel(trimmed);
  }

  function deleteVessel(vessel: string) {
    const voyageIds = new Set(
      store.voyages.filter((v) => v.vessel === vessel).map((v) => v.id)
    );
    setStore((prev) => ({
      voyages: prev.voyages.filter((v) => v.vessel !== vessel),
      portStops: prev.portStops.filter((p) => !voyageIds.has(p.voyageId)),
      hiddenVessels: ROUTE_TEMPLATE_VESSELS.includes(vessel)
        ? [...new Set([...prev.hiddenVessels, vessel])]
        : prev.hiddenVessels,
    }));
  }

  return (
    <div className="screen">
      <header className="app-header vessel-list-header">
        <div className="vessel-list-header-main">
          <h1>인원보고</h1>
          <p className="subtitle">선박 선택 → 항차 선택 → 기항지 인원 계산</p>
        </div>
        <ConfirmButton
          className="icon-btn danger"
          label="초기화"
          confirmLabel="한 번 더 탭하여 초기화"
          onConfirm={resetToDefaults}
        />
      </header>

      <div className="list">
        {vessels.length === 0 && !showForm && (
          <div className="empty-state">
            <p>등록된 선박이 없습니다.</p>
            <p>아래 버튼으로 선박을 등록하세요.</p>
          </div>
        )}

        {vessels.map((vessel) => {
          const count = voyageCountFor(vessel);
          return (
            <div key={vessel} className="card voyage-card" onClick={() => onOpenVessel(vessel)}>
              <div className="voyage-card-main">
                <div className="voyage-name">{vessel}</div>
                <div className="voyage-meta">항차 {count}개</div>
              </div>
              <ConfirmButton
                className="icon-btn danger"
                label="삭제"
                onConfirm={() => deleteVessel(vessel)}
              />
            </div>
          );
        })}
      </div>

      {showForm ? (
        <div className="card form-card">
          <label className="field">
            <span>선박 이름</span>
            <input
              autoFocus
              value={newVessel}
              onChange={(e) => setNewVessel(e.target.value)}
              placeholder="예: 새로운호"
            />
          </label>
          <div className="form-actions">
            <button className="btn secondary" onClick={() => setShowForm(false)}>
              취소
            </button>
            <button className="btn primary" onClick={createVessel}>
              등록
            </button>
          </div>
        </div>
      ) : (
        <button className="btn primary fab" onClick={() => setShowForm(true)}>
          + 새 선박 등록
        </button>
      )}
    </div>
  );
}
