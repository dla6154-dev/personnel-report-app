export interface RouteStop {
  name: string;
  time?: string; // 해당 기항지 출항(또는 도착) 시각
}

export interface RouteTemplate {
  vessel: string;
  depTime: string;
  label: string;
  stops: RouteStop[];
}

const RAW_SCHEDULE: Record<string, { depTime: string; label: string; stops: RouteStop[] }[]> = {
  산타모니카: [
    {
      depTime: "08:00",
      label: "진도 → 추자 → 제주",
      stops: [
        { name: "진도", time: "08:00" },
        { name: "추자", time: "09:10" },
        { name: "제주", time: "10:00" },
      ],
    },
    {
      depTime: "11:00",
      label: "제주 → 추자 → 진도",
      stops: [
        { name: "제주", time: "11:00" },
        { name: "추자" },
        { name: "진도", time: "12:30" },
      ],
    },
    {
      depTime: "13:30",
      label: "진도 → 추자 → 제주",
      stops: [
        { name: "진도", time: "13:30" },
        { name: "추자" },
        { name: "제주", time: "15:00" },
      ],
    },
    {
      depTime: "16:20",
      label: "제주 → 추자 → 진도",
      stops: [
        { name: "제주", time: "16:20" },
        { name: "추자", time: "17:35" },
        { name: "진도", time: "18:20" },
      ],
    },
  ],
  새섬두레: [
    {
      depTime: "07:20",
      label: "창유 → 진도",
      stops: [
        { name: "창유", time: "07:20" },
        { name: "진도", time: "07:50" },
      ],
    },
    {
      depTime: "09:30",
      label: "창유 → 진도",
      stops: [
        { name: "창유", time: "09:30" },
        { name: "진도", time: "10:00" },
      ],
    },
    {
      depTime: "11:20",
      label: "창유 → 진도",
      stops: [
        { name: "창유", time: "11:20" },
        { name: "진도", time: "11:50" },
      ],
    },
    {
      depTime: "12:10",
      label: "진도 → 창유 → 관매",
      stops: [
        { name: "진도", time: "12:10" },
        { name: "창유", time: "12:45" },
        { name: "관매", time: "13:25" },
      ],
    },
    {
      depTime: "14:30",
      label: "관매 → 창유 → 진도",
      stops: [
        { name: "관매" },
        { name: "창유", time: "14:30" },
        { name: "진도", time: "15:00" },
      ],
    },
  ],
  새섬관매: [
    {
      depTime: "11:10",
      label: "진도 → 관매",
      stops: [
        { name: "진도", time: "11:10" },
        { name: "관매", time: "12:05" },
      ],
    },
    {
      depTime: "15:50",
      label: "진도 → 창유 → 관매",
      stops: [
        { name: "진도", time: "15:50" },
        { name: "창유", time: "16:25" },
        { name: "관매", time: "17:10" },
      ],
    },
  ],
  섬사랑9: [
    {
      depTime: "09:00",
      label: "진도 → 슬도 → 독거 → 탄항 → 혈도 → 청등 → 죽항 → 창유 → 상하죽도 → 서거차도 → 곽도 → 맹골 → 죽도",
      stops: [
        { name: "진도", time: "09:00" },
        { name: "슬도", time: "09:35" },
        { name: "독거", time: "09:43" },
        { name: "탄항", time: "09:52" },
        { name: "혈도", time: "09:59" },
        { name: "청등", time: "10:31" },
        { name: "죽항", time: "10:43" },
        { name: "창유", time: "11:20" },
        { name: "상하죽도", time: "12:09" },
        { name: "서거차도", time: "12:14" },
        { name: "곽도", time: "12:37" },
        { name: "맹골", time: "12:49" },
        { name: "죽도", time: "12:52" },
      ],
    },
  ],
  한림페리11: [
    {
      depTime: "07:30",
      label: "진도 → 창유",
      stops: [
        { name: "진도", time: "07:30" },
        { name: "창유", time: "08:10" },
      ],
    },
    {
      depTime: "09:50",
      label: "진도 → 창유 → 관사 → 소마 → 모도 → 대마 → 관매 → 동거차 → 서거차",
      stops: [
        { name: "진도", time: "09:50" },
        { name: "창유", time: "10:30" },
        { name: "관사", time: "11:00" },
        { name: "소마", time: "11:10" },
        { name: "모도", time: "11:20" },
        { name: "대마", time: "11:30" },
        { name: "관매", time: "11:55" },
        { name: "동거차", time: "12:40" },
        { name: "서거차", time: "13:00" },
      ],
    },
    {
      depTime: "17:00",
      label: "진도 → 창유",
      stops: [
        { name: "진도", time: "17:00" },
        { name: "창유", time: "17:40" },
      ],
    },
  ],
  가사페리: [
    {
      depTime: "07:00",
      label: "쉬미 → 가사",
      stops: [
        { name: "쉬미", time: "07:00" },
        { name: "가사", time: "07:55" },
      ],
    },
    {
      depTime: "11:30",
      label: "쉬미 → 가사",
      stops: [
        { name: "쉬미", time: "11:30" },
        { name: "가사", time: "12:25" },
      ],
    },
    {
      depTime: "16:00",
      label: "쉬미 → 저도 → 광대 → 송도 → 혈도 → 양덕 → 주지 → 가사",
      stops: [
        { name: "쉬미", time: "16:00" },
        { name: "저도", time: "18:55" },
        { name: "광대", time: "18:20" },
        { name: "송도", time: "18:10" },
        { name: "혈도", time: "18:00" },
        { name: "양덕", time: "17:45" },
        { name: "주지", time: "17:30" },
        { name: "가사", time: "17:10" },
      ],
    },
  ],
  해진고속카페리: [
    {
      depTime: "06:00",
      label: "우수영 → 장산(축강) → 상태동리",
      stops: [
        { name: "우수영", time: "06:00" },
        { name: "장산(축강)", time: "06:40" },
        { name: "상태동리", time: "07:10" },
      ],
    },
    {
      depTime: "09:00",
      label: "우수영 → 장산(축강) → 상태동리",
      stops: [
        { name: "우수영", time: "09:00" },
        { name: "장산(축강)", time: "09:40" },
        { name: "상태동리", time: "10:10" },
      ],
    },
    {
      depTime: "12:30",
      label: "우수영 → 상태동리",
      stops: [
        { name: "우수영", time: "12:30" },
        { name: "상태동리", time: "13:20" },
      ],
    },
    {
      depTime: "15:00",
      label: "우수영 → 장산(축강) → 상태동리",
      stops: [
        { name: "우수영", time: "15:00" },
        { name: "장산(축강)", time: "15:40" },
        { name: "상태동리", time: "16:10" },
      ],
    },
  ],
};

export const ROUTE_TEMPLATES: RouteTemplate[] = Object.entries(RAW_SCHEDULE).flatMap(
  ([vessel, sailings]) => sailings.map((s) => ({ vessel, ...s }))
);

export const ROUTE_TEMPLATE_VESSELS = Object.keys(RAW_SCHEDULE);

export function routeTemplatesForVessel(vessel: string): RouteTemplate[] {
  return ROUTE_TEMPLATES.filter((r) => r.vessel === vessel);
}
