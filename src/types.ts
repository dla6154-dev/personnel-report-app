export interface Voyage {
  id: string;
  vessel: string; // 선박명
  depTime?: string; // 출항 시각
  routeLabel: string; // 항로 표시 텍스트
  initialCount: number; // 출항 시 최초 인원
  initialVehicleCount: number; // 출항 시 최초 차량 대수
  seeded?: boolean; // 항로 템플릿에서 자동 생성된 항차인지 여부
  createdAt: number;
}

export interface PortStop {
  id: string;
  voyageId: string;
  name: string;
  order: number;
  boarding: number; // 승선 인원
  disembarking: number; // 하선 인원
  vehicleBoarding: number; // 승차 차량
  vehicleDisembarking: number; // 하차 차량
  destinationPassengerCounts?: Record<string, number>; // 이후 기항지별 하선 인원
  destinationVehicleCounts?: Record<string, number>; // 이후 기항지별 하차 차량
  plannedTime?: string; // 시간표 기준 출항(도착) 시각
  memo?: string;
  createdAt: number;
}
