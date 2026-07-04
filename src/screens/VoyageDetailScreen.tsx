import { useRef, useState } from "react";
import { useStore } from "../storage";
import type { PortStop } from "../types";
import ConfirmButton from "../components/ConfirmButton";
import { EditIcon } from "../components/icons";
import { normalizeWholeNumberInput, parseWholeNumberInput } from "../numericInput";
import { deriveVoyageStops, sortStops, type DerivedVoyageStop } from "../voyageManifest";

interface Props {
  voyageId: string;
  onBack: () => void;
}

export default function VoyageDetailScreen({ voyageId, onBack }: Props) {
  const [store, setStore] = useStore();
  const voyage = store.voyages.find((v) => v.id === voyageId);
  const [editingVoyageInfo, setEditingVoyageInfo] = useState(false);
  const [depTimeDraft, setDepTimeDraft] = useState("");
  const [routeLabelDraft, setRouteLabelDraft] = useState("");
  const [initialCountDraft, setInitialCountDraft] = useState("0");
  const [initialVehicleCountDraft, setInitialVehicleCountDraft] = useState("0");
  const [countCardDrafts, setCountCardDrafts] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

  if (!voyage) {
    return (
      <div className="screen">
        <p>항해를 찾을 수 없습니다.</p>
        <button className="btn secondary" onClick={onBack}>
          목록으로
        </button>
      </div>
    );
  }

  const stops = store.portStops
    .filter((p) => p.voyageId === voyageId)
    .sort(sortStops);
  const rows = deriveVoyageStops(voyage, stops);

  function openVoyageInfoEdit() {
    setDepTimeDraft(voyage!.depTime ?? "");
    setRouteLabelDraft(voyage!.routeLabel);
    setInitialCountDraft(String(voyage!.initialCount));
    setInitialVehicleCountDraft(String(voyage!.initialVehicleCount));
    setEditingVoyageInfo(true);
  }

  function saveVoyageInfo() {
    const trimmed = routeLabelDraft.trim();
    if (!trimmed) return;
    setStore((prev) => ({
      ...prev,
      voyages: prev.voyages.map((v) =>
        v.id === voyageId
          ? {
              ...v,
              routeLabel: trimmed,
              depTime: depTimeDraft.trim() || undefined,
              initialCount: parseWholeNumberInput(initialCountDraft),
              initialVehicleCount: parseWholeNumberInput(initialVehicleCountDraft),
            }
          : v
      ),
    }));
    setEditingVoyageInfo(false);
  }

  function addStop() {
    const maxOrder = stops.reduce((m, s) => Math.max(m, s.order), 0);
    const stop: PortStop = {
      id: crypto.randomUUID(),
      voyageId,
      name: "",
      order: maxOrder + 1,
      boarding: 0,
      disembarking: 0,
      vehicleBoarding: 0,
      vehicleDisembarking: 0,
      destinationPassengerCounts: {},
      destinationVehicleCounts: {},
      createdAt: Date.now(),
    };
    setStore((prev) => ({ ...prev, portStops: [...prev.portStops, stop] }));
  }

  function updateStop(id: string, patch: Partial<PortStop>) {
    setStore((prev) => ({
      ...prev,
      portStops: prev.portStops.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }

  function updateDestinationCount(
    stopId: string,
    destinationId: string,
    kind: "passenger" | "vehicle",
    nextValue: number
  ) {
    setStore((prev) => {
      const voyageStops = prev.portStops.filter((p) => p.voyageId === voyageId).sort(sortStops);
      const firstStopId = voyageStops[0]?.id;
      const stopIndex = voyageStops.findIndex((stop) => stop.id === stopId);
      const futureStopIds =
        stopIndex >= 0 ? voyageStops.slice(stopIndex + 1).map((stop) => stop.id) : [];

      const portStops = prev.portStops.map((stop) => {
        if (stop.id !== stopId) return stop;

        const nextPassengerCounts =
          kind === "passenger"
            ? { ...(stop.destinationPassengerCounts ?? {}), [destinationId]: nextValue }
            : { ...(stop.destinationPassengerCounts ?? {}) };
        const nextVehicleCounts =
          kind === "vehicle"
            ? { ...(stop.destinationVehicleCounts ?? {}), [destinationId]: nextValue }
            : { ...(stop.destinationVehicleCounts ?? {}) };

        return {
          ...stop,
          boarding: futureStopIds.reduce(
            (total, futureStopId) => total + (nextPassengerCounts[futureStopId] ?? 0),
            0
          ),
          vehicleBoarding: futureStopIds.reduce(
            (total, futureStopId) => total + (nextVehicleCounts[futureStopId] ?? 0),
            0
          ),
          destinationPassengerCounts: nextPassengerCounts,
          destinationVehicleCounts: nextVehicleCounts,
        };
      });

      if (stopId !== firstStopId) {
        return { ...prev, portStops };
      }

      const updatedVoyageStops = portStops.filter((p) => p.voyageId === voyageId).sort(sortStops);
      const updatedFirstStop = updatedVoyageStops[0];
      const firstStopFutureIds = updatedVoyageStops.slice(1).map((stop) => stop.id);
      const initialCount = firstStopFutureIds.reduce(
        (total, futureStopId) => total + (updatedFirstStop?.destinationPassengerCounts?.[futureStopId] ?? 0),
        0
      );
      const initialVehicleCount = firstStopFutureIds.reduce(
        (total, futureStopId) => total + (updatedFirstStop?.destinationVehicleCounts?.[futureStopId] ?? 0),
        0
      );

      return {
        ...prev,
        voyages: prev.voyages.map((currentVoyage) =>
          currentVoyage.id === voyageId
            ? { ...currentVoyage, initialCount, initialVehicleCount }
            : currentVoyage
        ),
        portStops,
      };
    });
  }

  function deleteStop(id: string) {
    setStore((prev) => ({ ...prev, portStops: prev.portStops.filter((p) => p.id !== id) }));
  }

  function reorderStop(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIdx = stops.findIndex((s) => s.id === sourceId);
    const targetIdx = stops.findIndex((s) => s.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const reordered = [...stops];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const newOrderById = new Map(reordered.map((s, i) => [s.id, i + 1]));
    setStore((prev) => ({
      ...prev,
      portStops: prev.portStops.map((p) =>
        newOrderById.has(p.id) ? { ...p, order: newOrderById.get(p.id)! } : p
      ),
    }));
  }

  function handleWindowPointerMove(e: PointerEvent) {
    if (!draggingIdRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const group = el?.closest<HTMLElement>("[data-stop-id]");
    if (group && group.dataset.stopId !== dragOverIdRef.current) {
      dragOverIdRef.current = group.dataset.stopId ?? null;
      setDragOverId(group.dataset.stopId ?? null);
    }
  }

  function handleWindowPointerUp() {
    if (draggingIdRef.current && dragOverIdRef.current) {
      reorderStop(draggingIdRef.current, dragOverIdRef.current);
    }
    draggingIdRef.current = null;
    dragOverIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    window.removeEventListener("pointercancel", handleWindowPointerUp);
  }

  function handleDragHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.preventDefault();
    draggingIdRef.current = id;
    dragOverIdRef.current = null;
    setDraggingId(id);
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
  }

  function renderReportCard(
    draftKey: string,
    value: number,
    label: string,
    tone: "boarding" | "disembark",
    editable: boolean,
    onChange?: (nextValue: number) => void
  ) {
    const hasDraft = Object.prototype.hasOwnProperty.call(countCardDrafts, draftKey);
    const displayValue = hasDraft ? countCardDrafts[draftKey] : value === 0 ? "" : String(value);

    return (
      <div
        className={`count-card ${tone} ${editable ? "editable" : "readonly"} ${
          editable && displayValue ? "has-value" : ""
        }`}
      >
        {editable ? (
          <>
            <EditIcon className="count-card-badge-icon" />
            <span className="count-card-placeholder" aria-hidden="true">
              {label}
            </span>
            <input
              className="count-card-input"
              type="text"
              inputMode="numeric"
              aria-label={label}
              placeholder=" "
              value={displayValue}
              onChange={(e) => {
                const normalized = normalizeWholeNumberInput(e.target.value);
                setCountCardDrafts((prev) =>
                  prev[draftKey] === normalized ? prev : { ...prev, [draftKey]: normalized }
                );
                onChange?.(parseWholeNumberInput(normalized));
              }}
            />
          </>
        ) : (
          <div className="count-card-readout" aria-label={label}>
            <span className="count-card-readout-label">{label}</span>
            <strong className="count-card-readout-value">{value}</strong>
          </div>
        )}
      </div>
    );
  }

  function renderDestinationPlanner(
    stop: PortStop,
    futureStops: PortStop[],
    kind: "passenger" | "vehicle"
  ) {
    if (futureStops.length === 0) {
      return <div className="destination-plan-note">최종 기항지</div>;
    }

    return (
      <div className="destination-plan-list">
        {futureStops.map((futureStop) => {
          const value =
            kind === "passenger"
              ? stop.destinationPassengerCounts?.[futureStop.id] ?? 0
              : stop.destinationVehicleCounts?.[futureStop.id] ?? 0;

          return (
            <div
              key={`${stop.id}-${futureStop.id}-${kind}`}
              className="destination-plan-item destination-plan-item-disembark"
            >
              {renderReportCard(
                `${stop.id}-${futureStop.id}-${kind}`,
                value,
                `${futureStop.name} ${kind === "passenger" ? "하선" : "하차"}`,
                "disembark",
                true,
                (nextValue) => updateDestinationCount(stop.id, futureStop.id, kind, nextValue)
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderBoardingCell(row: DerivedVoyageStop, kind: "passenger" | "vehicle") {
    const label = kind === "passenger" ? "승선" : "승차";
    const value = kind === "passenger" ? row.passengerBoarding : row.vehicleBoarding;
    const singleFutureStop = row.futureStops.length === 1 ? row.futureStops[0] : null;

    if (singleFutureStop) {
      return renderReportCard(
        `${row.stop.id}-${singleFutureStop.id}-${kind}-boarding`,
        value,
        label,
        "boarding",
        true,
        (nextValue) => updateDestinationCount(row.stop.id, singleFutureStop.id, kind, nextValue)
      );
    }

    return (
      <div className="movement-card-stack">
        {renderReportCard(`${row.stop.id}-${kind}-readonly`, value, label, "boarding", false)}
        {renderDestinationPlanner(row.stop, row.futureStops, kind)}
      </div>
    );
  }

  function joinWithSep(parts: React.ReactNode[]): React.ReactNode[] {
    return parts.reduce<React.ReactNode[]>((acc, part, index) => {
      if (index === 0) return [part];
      return [...acc, <span key={`sep-${index}`}> · </span>, part];
    }, []);
  }

  function renderReportPhrase(row: DerivedVoyageStop, includeTotal = true) {
    const showBoarding = row.futureStops.length > 0;
    const showDisembarking = row.stop.id !== rows[0].stop.id;

    const passengerParts: React.ReactNode[] = [];
    if (showBoarding) {
      passengerParts.push(
        <span key="board-p" className="report-phrase-boarding">
          승선 {row.passengerBoarding}명
        </span>
      );
    }
    if (showDisembarking) {
      passengerParts.push(
        <span key="disembark-p" className="report-phrase-disembark">
          하선 {row.passengerDisembarking}명
        </span>
      );
    }

    const vehicleParts: React.ReactNode[] = [];
    if (showBoarding) {
      vehicleParts.push(
        <span key="board-v" className="report-phrase-boarding">
          승차 {row.vehicleBoarding}대
        </span>
      );
    }
    if (showDisembarking) {
      vehicleParts.push(
        <span key="disembark-v" className="report-phrase-disembark">
          하차 {row.vehicleDisembarking}대
        </span>
      );
    }

    return (
      <div className="report-phrase">
        <div className="report-phrase-line">{joinWithSep(passengerParts)}</div>
        <div className="report-phrase-line">{joinWithSep(vehicleParts)}</div>
        {includeTotal && (
          <div className="report-phrase-line report-phrase-total">
            총 {row.runningTotal}명에 {row.runningVehicleTotal}대
          </div>
        )}
      </div>
    );
  }

  function renderStopCard(row: DerivedVoyageStop, index: number) {
    const isDragging = draggingId === row.stop.id;
    const isDragOver = dragOverId === row.stop.id;
    const showBoardingRow = row.futureStops.length > 0;
    const showDisembarkingRow = index > 0;

    return (
      <div
        key={row.stop.id}
        data-stop-id={row.stop.id}
        className={[
          "card",
          "stop-card",
          isDragging ? "port-row-dragging" : "",
          isDragOver ? "port-row-drag-over" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="stop-card-header">
          <div className="stop-card-meta">
            <span className="stop-card-time">{row.stop.plannedTime ?? "-"}</span>
            <input
              className="stop-card-name-input"
              value={row.stop.name}
              placeholder="기항지명"
              onChange={(e) => updateStop(row.stop.id, { name: e.target.value })}
            />
            <span className="stop-card-role">{index === 0 ? "출항지" : "기항지"}</span>
          </div>
          <div className="stop-card-actions">
            <button
              className="icon-btn drag-handle"
              onPointerDown={(e) => handleDragHandlePointerDown(e, row.stop.id)}
              aria-label="순서 변경"
            >
              ⠿
            </button>
            <ConfirmButton
              className="icon-btn danger"
              label="삭제"
              onConfirm={() => deleteStop(row.stop.id)}
            />
          </div>
        </div>

        {showBoardingRow && (
          <div className="stop-card-grid">
            <div className="movement-cell">{renderBoardingCell(row, "passenger")}</div>
            <div className="movement-cell">{renderBoardingCell(row, "vehicle")}</div>
          </div>
        )}

        {showDisembarkingRow && (
          <div className="stop-card-grid">
            <div className="movement-cell">
              {renderReportCard(
                `${row.stop.id}-passenger-disembark-readonly`,
                row.passengerDisembarking,
                "하선",
                "disembark",
                false
              )}
            </div>
            <div className="movement-cell">
              {renderReportCard(
                `${row.stop.id}-vehicle-disembark-readonly`,
                row.vehicleDisembarking,
                "하차",
                "disembark",
                false
              )}
            </div>
          </div>
        )}

        <div className="stop-card-footer">
          <div className="stop-card-totals">
            <div className="stop-card-total">
              <span className="stop-card-total-label">총 인원</span>
              <strong className="stop-card-total-value">{row.runningTotal}명</strong>
            </div>
            <div className="stop-card-total">
              <span className="stop-card-total-label">총 차량</span>
              <strong className="stop-card-total-value">{row.runningVehicleTotal}대</strong>
            </div>
          </div>
          <div className="stop-card-report">{renderReportPhrase(row)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="app-header with-back">
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          ← 목록
        </button>
        <h1>
          {voyage.vessel} · {voyage.depTime ? `${voyage.depTime} ` : ""}
          {voyage.routeLabel}
        </h1>
        {!editingVoyageInfo && (
          <button className="icon-btn" onClick={openVoyageInfoEdit}>
            수정
          </button>
        )}
      </header>

      {editingVoyageInfo && (
        <div className="card form-card">
          <div className="field-row">
            <label className="field">
              <span>출항 시각 (선택)</span>
              <input
                value={depTimeDraft}
                onChange={(e) => setDepTimeDraft(e.target.value)}
                placeholder="예: 08:00"
              />
            </label>
            <label className="field">
              <span>항로/항차 이름</span>
              <input
                autoFocus
                value={routeLabelDraft}
                onChange={(e) => setRouteLabelDraft(e.target.value)}
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>최초 승선 인원 (출항 시)</span>
              <input
                type="text"
                inputMode="numeric"
                value={initialCountDraft}
                onChange={(e) => setInitialCountDraft(normalizeWholeNumberInput(e.target.value))}
              />
            </label>
            <label className="field">
              <span>최초 차량 대수 (출항 시)</span>
              <input
                type="text"
                inputMode="numeric"
                value={initialVehicleCountDraft}
                onChange={(e) =>
                  setInitialVehicleCountDraft(normalizeWholeNumberInput(e.target.value))
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn secondary" onClick={() => setEditingVoyageInfo(false)}>
              취소
            </button>
            <button className="btn primary" onClick={saveVoyageInfo}>
              저장
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>등록된 기항지가 없습니다.</p>
          <p>아래 버튼으로 기항지를 추가하세요.</p>
        </div>
      ) : (
        <div className="stop-card-list">
          {rows.map((row, index) => renderStopCard(row, index))}
        </div>
      )}

      <button className="btn primary fab" onClick={addStop}>
        + 기항지 추가
      </button>
    </div>
  );
}
