# LIGHTBRINGER 외부 AI 연결 가이드

LIGHTBRINGER는 대본 분석과 영상 생성을 서로 독립된 어댑터로 연결합니다. 브라우저에는 API 키를 저장하지 않으며, 모든 키는 서버의 암호화된 비밀 환경변수에만 둡니다.

## 권장 역할 분담

| 작업 | 기본 제안 | 이유 |
| --- | --- | --- |
| 반복적인 대본 구간 분석·샷 분할 | Claude의 균형형 모델 또는 OpenAI의 비용 효율형 모델 | 구간별 구조화 출력이 많아 비용과 처리량이 중요합니다. |
| 애매한 연출 해석·최종 감수 | Claude의 상위 추론형 모델 또는 GPT-5.6 Sol | 난도가 높은 구간만 선택 호출해 품질을 올립니다. |
| 스토리보드·영상 생성 | BytePlus/Volcengine Ark의 Seedance 엔드포인트 | 비동기 작업 ID로 생성과 상태 조회를 분리할 수 있습니다. |

정확한 모델 ID는 계정과 리전에 따라 달라질 수 있으므로 콘솔에서 발급된 값을 환경변수에 넣습니다. 코드에는 특정 모델명을 강제로 고정하지 않습니다.

## 1. Claude와 GPT 연결

프로젝트 루트에서 `.env.example`을 `.env`로 복사한 뒤 서버 환경에 다음 값을 등록합니다. 실제 키는 Git에 커밋하거나 채팅으로 보내지 않습니다.

```dotenv
LIGHTBRINGER_LLM_EXTERNAL_ENABLED=true
LIGHTBRINGER_LLM_PROVIDER=anthropic

ANTHROPIC_API_KEY=your-secret
ANTHROPIC_MODEL=your-claude-model-id

OPENAI_API_KEY=your-secret
OPENAI_MODEL=your-openai-model-id
```

두 공급자가 모두 준비되면 화면의 `대본 분석 엔진` 목록에서 Claude와 OpenAI를 선택할 수 있습니다. 서버 기본값은 `LIGHTBRINGER_LLM_PROVIDER`가 정합니다.

- OpenAI 어댑터는 Responses API의 엄격한 JSON Schema 출력을 사용합니다.
- Anthropic 어댑터는 Messages API의 `output_config.format` JSON Schema 출력을 사용합니다.
- 대사·시각 지문·청각 지문·카메라·타이밍·에셋 코드를 같은 스키마로 정규화합니다.
- 자동 재시도는 하지 않습니다. 실패한 구간만 사용자가 다시 요청해야 중복 과금을 피할 수 있습니다.

## 2. BytePlus Seedance 연결

BytePlus ModelArk 콘솔에서 API 키와 사용할 Seedance 모델 또는 엔드포인트 ID를 발급받아 등록합니다.

```dotenv
LIGHTBRINGER_VIDEO_EXTERNAL_ENABLED=true
LIGHTBRINGER_VIDEO_PROVIDER=byteplus
BYTEPLUS_API_KEY=your-secret
BYTEPLUS_SEEDANCE_MODEL=your-endpoint-or-model-id
BYTEPLUS_API_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
```

중국 본토의 Volcengine Ark 계정을 사용한다면 다음 구성을 사용합니다.

```dotenv
LIGHTBRINGER_VIDEO_PROVIDER=volcengine
VOLCENGINE_ARK_API_KEY=your-secret
VOLCENGINE_SEEDANCE_MODEL=your-endpoint-or-model-id
VOLCENGINE_ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

렌더 요청은 샷 하나당 비동기 작업 하나를 만들며, 응답의 작업 ID를 보존합니다. 화면의 비용 확인 체크가 선택되지 않으면 서버가 외부 렌더 요청을 거부합니다.

## 3. 연결 확인

서버를 다시 시작한 뒤 다음 주소를 확인합니다.

```text
GET /api/health
```

`providers`와 `videoProviders`에서 `ready: true`가 표시되어야 합니다. 응답에는 키나 API 주소가 포함되지 않습니다.

대본 분석:

```http
POST /api/v1/screenplay/analyze
Content-Type: application/json

{
  "provider": "anthropic",
  "language": "ko",
  "screenplay": "승인된 대본 원문"
}
```

Seedance 작업 생성:

```http
POST /api/v1/render/jobs
Content-Type: application/json

{
  "provider": "byteplus",
  "prompt": "English shot generation prompt...",
  "negativePrompt": "distorted anatomy, subtitles",
  "duration": 5,
  "ratio": "16:9",
  "resolution": "1080p",
  "confirmedCost": true
}
```

작업 조회:

```text
GET /api/v1/render/jobs/{task-id}?provider=byteplus
```

## 공개 데모 보안 원칙

현재 공개 LIGHTBRINGER 데모는 `mock` 모드로 유지합니다. 실제 키가 설정된 배포본은 로그인과 역할 권한이 적용된 사내 서버에서만 운영하는 것을 권장합니다. 공개 사이트에 실제 키를 연결하면 방문자가 사용자의 크레딧을 소비할 수 있습니다.

## 공식 문서

- OpenAI Models: https://developers.openai.com/api/docs/models
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- Anthropic Messages API: https://platform.claude.com/docs/en/api/messages/create
- Anthropic structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- BytePlus Seedance create task: https://docs.byteplus.com/en/docs/modelark/1520757
- BytePlus Seedance retrieve task: https://docs.byteplus.com/en/docs/ModelArk/1521309
