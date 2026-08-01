# 라이트블링거 자체 호스팅 데모

[한국어](SELF_HOSTED_DEMO.ko.md) · [English](SELF_HOSTED_DEMO.md)

이 저장소에는 상용 애플리케이션과 분리해서 새로 만든 공개 데모가 포함됩니다. 고객 프로젝트, 제작 미디어, 계정 시스템과 상용 소스 코드는 공개하지 않습니다.

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm start
```

`http://localhost:4173`을 엽니다. 기본 `mock` 엔진은 항상 같은 결과를 만들며 외부 API를 호출하지 않습니다.

## 사용자 소유 LLM API 연결

`.env.example`의 항목을 서버 또는 호스팅 서비스의 비밀 환경변수에 등록합니다. 실제 키를 Git, 브라우저 코드, 공개 이슈나 캡처 이미지에 넣으면 안 됩니다.

지원 프로토콜:

- `mock`: 비용 없는 공개 더미 엔진
- `openai-compatible`: `/v1/chat/completions`를 지원하는 서버
- `anthropic`: Anthropic Messages API

서버 설정 예시:

```text
LIGHTBRINGER_PROVIDER=anthropic
LIGHTBRINGER_EXTERNAL_API_ENABLED=true
LIGHTBRINGER_API_BASE_URL=https://api.anthropic.com
LIGHTBRINGER_API_KEY=호스팅-비밀저장소에-등록
LIGHTBRINGER_MODEL=사용할-모델명
```

브라우저에는 엔진 이름, 연결 여부, 모델 이름과 요청 제한만 전달합니다. API 키와 비공개 기본 주소는 상태 응답에 포함하지 않습니다.

## 비용·오류 안전장치

- `LIGHTBRINGER_EXTERNAL_API_ENABLED=true`를 명시해야 외부 호출 가능
- 대본 입력과 모델 출력 크기 제한
- 요청 시간 초과 처리
- 잘못되거나 잘린 JSON 거부
- 실패 시 자동 재시도를 하지 않아 중복 과금 방지
- 모든 응답에 요청 ID 부여
- 공개 데모의 렌더는 비용 없는 더미 대기열로만 작동

## API 계약

### `GET /api/health`

공개 가능한 엔진 상태만 반환합니다. 키와 비공개 기본 주소는 반환하지 않습니다.

### `POST /api/v1/screenplay/analyze`

```json
{
  "screenplay": "INT. 관측실...",
  "language": "ko"
}
```

응답은 엔진 종류와 관계없이 `segments`, `shots`, `continuity` 구조로 통일됩니다.

## 컨테이너 배포

```bash
docker build -t lightbringer-demo .
docker run --rm -p 4173:4173 --env-file .env lightbringer-demo
```

Dockerfile과 비밀 환경변수를 지원하는 서비스라면 배포할 수 있습니다. 외부 구간은 HTTPS를 사용하고, 다른 사람이 관리하는 포크에 본인의 API 키를 연결하지 마세요.

## 공개 데모에서 제외한 것

- 로그인·초대·실제 제작 권한
- 운영 데이터베이스와 대용량 스토리지
- 고객 및 미공개 프로젝트 데이터
- 실제 이미지·영상 생성 호출
- 상용 라이트블링거 소스 코드

공개 데모가 제품 구조를 설명하면서도 실제 제작 시스템의 보안을 침범하지 않도록 둔 경계입니다.
