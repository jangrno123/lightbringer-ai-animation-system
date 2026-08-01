export const DEMO_SCREENPLAY_KO = `INT. 라이트브링거 관측실 - 심우주

푸른 항성광이 금이 간 관측창을 가른다. 아리아는 흔들리는 콘솔을 붙잡고 닫혀 가는 도약문을 바라본다.

아리아
도약창이 닫히기까지 사십이 초. 이번에 놓치면 돌아갈 길이 없어.

경보음이 빨라진다. 녹스가 손상된 항법 장치를 우회 연결한다.

녹스
좌표를 고정해. 나머지는 내가 붙잡을게.

함선이 거대한 푸른 섬광을 향해 기울어진다.`;

export const DEMO_SCREENPLAY_EN = `INT. LIGHTBRINGER OBSERVATION DECK - DEEP SPACE

Cold blue starlight cuts across the cracked observation window. Aria grips the shaking console and watches the jump gate collapse.

ARIA
Forty-two seconds until the jump gate closes. If we miss it now, there is no way back.

The warning pulse accelerates. Nox bypasses the damaged navigation array.

NOX
Hold the coordinates. I will keep the rest together.

The ship banks toward a vast blue flare.`;

const shots = [
  {
    id: "DEMO-SH001",
    title: { ko: "금이 간 관측창", en: "The Cracked Window" },
    durationSeconds: 7,
    framing: { ko: "와이드 숏", en: "Wide shot" },
    camera: { ko: "느린 전진 이동", en: "Slow push-in" },
    dialogue: "",
    speaker: "",
    visual: { ko: "푸른 항성광이 관측실과 흔들리는 콘솔을 가른다.", en: "Cold blue starlight cuts across the observation deck and shaking console." },
    audio: { ko: "낮은 선체 진동음, 먼 경보음", en: "Low hull vibration, distant warning pulse" },
    assets: ["@LB_OBSERVATION", "@ARIA_PILOT"]
  },
  {
    id: "DEMO-SH002",
    title: { ko: "아리아의 제한 시간", en: "Aria's Time Limit" },
    durationSeconds: 9,
    framing: { ko: "미디엄 클로즈업", en: "Medium close-up" },
    camera: { ko: "고정, 미세한 핸드헬드 진동", en: "Locked, subtle handheld vibration" },
    dialogue: { ko: "도약창이 닫히기까지 사십이 초. 이번에 놓치면 돌아갈 길이 없어.", en: "Forty-two seconds until the jump gate closes. If we miss it now, there is no way back." },
    speaker: "ARIA",
    visual: { ko: "붉은 콘솔 오류광이 아리아의 얼굴 아래에 반사된다.", en: "Red console error light reflects under Aria's face." },
    audio: { ko: "억제된 호흡과 콘솔 오류음", en: "Controlled breath and console error tone" },
    assets: ["@ARIA_PILOT", "@LB_OBSERVATION"]
  },
  {
    id: "DEMO-SH003",
    title: { ko: "녹스의 우회 연결", en: "Nox's Bypass" },
    durationSeconds: 8,
    framing: { ko: "오버숄더 숏", en: "Over-the-shoulder" },
    camera: { ko: "콘솔을 따라 우측 패닝", en: "Pan right across the console" },
    dialogue: { ko: "좌표를 고정해. 나머지는 내가 붙잡을게.", en: "Hold the coordinates. I will keep the rest together." },
    speaker: "NOX",
    visual: { ko: "녹스가 손상된 항법선을 수동 포트에 연결한다.", en: "Nox locks a damaged navigation line into the manual port." },
    audio: { ko: "금속 체결음, 빨라지는 경보", en: "Metal latch, accelerating warning pulse" },
    assets: ["@NOX_ENGINEER", "@LB_OBSERVATION"]
  }
];

export function analyzeMock({ language = "ko" } = {}) {
  const lang = language === "en" ? "en" : "ko";
  return {
    mode: "mock",
    project: "ORBITAL ECHO",
    sceneId: "DEMO-SC001",
    sceneTitle: lang === "ko" ? "무음 궤도의 신호" : "Signal in Silent Orbit",
    estimatedDurationSeconds: 42,
    segments: [
      { id: "SEG001", title: lang === "ko" ? "관측실의 제한 시간" : "Observation Deck Countdown", status: "ready", shotIds: ["DEMO-SH001", "DEMO-SH002"] },
      { id: "SEG002", title: lang === "ko" ? "항법 장치 우회" : "Navigation Bypass", status: "ready", shotIds: ["DEMO-SH003"] }
    ],
    shots: shots.map((shot) => ({
      id: shot.id,
      title: shot.title[lang],
      durationSeconds: shot.durationSeconds,
      framing: shot.framing[lang],
      camera: shot.camera[lang],
      speaker: shot.speaker,
      dialogue: typeof shot.dialogue === "string" ? shot.dialogue : shot.dialogue[lang],
      visualDirection: shot.visual[lang],
      audioDirection: shot.audio[lang],
      assets: shot.assets,
      status: "draft"
    })),
    continuity: {
      locationFlow: ["@LB_OBSERVATION"],
      characterAssets: ["@ARIA_PILOT", "@NOX_ENGINEER"],
      unresolved: []
    }
  };
}
