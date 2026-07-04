import { useState } from "react";
import { useStore } from "../storage";
import type { PortStop, Voyage } from "../types";
import ConfirmButton from "../components/ConfirmButton";
import { routeTemplatesForVessel } from "../routeTemplates";
import { normalizeWholeNumberInput, parseWholeNumberInput } from "../numericInput";
import { deriveVoyageStops, sortStops } from "../voyageManifest";

interface Props {
  vessel: string;
  onBack: () => void;
  onOpenVoyage: (id: string) => void;
}

export default function VoyageListScreen({ vessel, onBack, onOpenVoyage }: Props) {
  const [store, setStore] = useStore();
  const [showForm, setShowForm] = useState(false);
  const [depTime, setDepTime] = useState("");
  const [routeLabel, setRouteLabel] = useState("");
  const [initialCount, setInitialCount] = useState("0");
  const [initialVehicleCount, setInitialVehicleCount] = useState("0");
  const [templateKey, setTemplateKey] = useState("");

  const voyages = store.voyages
    .filter((v) => v.vessel === vessel)
    .sort((a, b) => a.createdAt - b.createdAt);
  const availableTemplates = routeTemplatesForVessel(vessel);
  const selectedTemplate = availableTemplates.find(
    (t) => `${t.depTime}|${t.label}` === templateKey
  );

  function applyTemplate(key: string) {
    setTemplateKey(key);
    const template = availableTemplates.find((t) => `${t.depTime}|${t.label}` === key);
    if (template) {
      setDepTime(template.depTime);
      setRouteLabel(template.label);
    }
  }

  function resetForm() {
    setDepTime("");
    setRouteLabel("");
    setInitialCount("0");
    setInitialVehicleCount("0");
    setTemplateKey("");
  }

  function createVoyage() {
    const trimmed = routeLabel.trim();
    if (!trimmed) return;
    const voyage: Voyage = {
      id: crypto.randomUUID(),
      vessel,
      depTime: depTime.trim() || undefined,
      routeLabel: trimmed,
      initialCount: parseWholeNumberInput(initialCount),
      initialVehicleCount: parseWholeNumberInput(initialVehicleCount),
      createdAt: Date.now(),
    };
    const templateStops = selectedTemplate ? selectedTemplate.stops : [];
    const newStops: PortStop[] = templateStops.map((stop, i) => ({
      id: crypto.randomUUID(),
      voyageId: voyage.id,
      name: stop.name,
      order: i + 1,
      boarding: 0,
      disembarking: 0,
      vehicleBoarding: 0,
      vehicleDisembarking: 0,
      destinationPassengerCounts: {},
      destinationVehicleCounts: {},
      plannedTime: stop.time,
      createdAt: Date.now(),
    }));
    setStore((prev) => ({
      ...prev,
      voyages: [...prev.voyages, voyage],
      portStops: [...prev.portStops, ...newStops],
    }));
    resetForm();
    setShowForm(false);
    onOpenVoyage(voyage.id);
  }

  function deleteVoyage(id: string) {
    setStore((prev) => ({
      ...prev,
      voyages: prev.voyages.filter((v) => v.id !== id),
      portStops: prev.portStops.filter((p) => p.voyageId !== id),
    }));
  }

  function countFor(voyageId: string) {
    const stops = store.portStops
      .filter((p) => p.voyageId === voyageId)
      .sort(sortStops);
    const voyage = store.voyages.find((v) => v.id === voyageId);
    if (!voyage) return { total: 0, vehicleTotal: 0 };

    const derivedStops = deriveVoyageStops(voyage, stops);
    const lastStop = derivedStops.at(-1);
    return {
      total: lastStop?.runningTotal ?? 0,
      vehicleTotal: lastStop?.runningVehicleTotal ?? 0,
    };
  }

  return (
    <div className="screen">
      <header className="app-header with-back">
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          ← 선박 목록
        </button>
        <h1>{vessel}</h1>
      </header>

      <div className="list">
        {voyages.length === 0 && !showForm && (
          <div className="empty-state">
            <p>등록된 항차가 없습니다.</p>
            <p>아래 버튼으로 항차를 등록하세요.</p>
          </div>
        )}

        {voyages.map((v) => {
          const { total, vehicleTotal } = countFor(v.id);
          return (
            <div key={v.id} className="card voyage-card" onClick={() => onOpenVoyage(v.id)}>
              <div className="voyage-card-main">
                <div className="voyage-name">
                  {v.depTime && <span className="voyage-dep-time">{v.depTime}</span>} {v.routeLabel}
                </div>
                <div className="voyage-meta">
                  기항지 {store.portStops.filter((p) => p.voyageId === v.id).length}곳 · 인원{" "}
                  <strong>{total}명</strong> · 차량 <strong>{vehicleTotal}대</strong>
                </div>
              </div>
              <ConfirmButton
                className="icon-btn danger"
                label="삭제"
                onConfirm={() => deleteVoyage(v.id)}
              />
            </div>
          );
        })}
      </div>

      {showForm ? (
        <div className="card form-card">
          {availableTemplates.length > 0 && (
            <label className="field">
              <span>항차 템플릿 (선택)</span>
              <select value={templateKey} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">직접 입력</option>
                {availableTemplates.map((t) => (
                  <option key={`${t.depTime}|${t.label}`} value={`${t.depTime}|${t.label}`}>
                    {t.depTime} · {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedTemplate && (
            <div className="port-memo">
              기항지 자동 등록:{" "}
              {selectedTemplate.stops
                .map((s) => (s.time ? `${s.name}(${s.time})` : s.name))
                .join(", ")}
            </div>
          )}

          <div className="field-row">
            <label className="field">
              <span>출항 시각 (선택)</span>
              <input
                value={depTime}
                onChange={(e) => setDepTime(e.target.value)}
                placeholder="예: 08:00"
              />
            </label>
            <label className="field">
              <span>항로/항차 이름</span>
              <input
                autoFocus
                value={routeLabel}
                onChange={(e) => setRouteLabel(e.target.value)}
                placeholder="예: 진도 → 추자 → 제주"
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>최초 승선 인원 (출항 시)</span>
              <input
                type="text"
                inputMode="numeric"
                value={initialCount}
                onChange={(e) => setInitialCount(normalizeWholeNumberInput(e.target.value))}
              />
            </label>
            <label className="field">
              <span>최초 차량 대수 (출항 시)</span>
              <input
                type="text"
                inputMode="numeric"
                value={initialVehicleCount}
                onChange={(e) => setInitialVehicleCount(normalizeWholeNumberInput(e.target.value))}
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="btn secondary"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              취소
            </button>
            <button className="btn primary" onClick={createVoyage}>
              등록
            </button>
          </div>
        </div>
      ) : (
        <button className="btn primary fab" onClick={() => setShowForm(true)}>
          + 항차 추가
        </button>
      )}
    </div>
  );
}
