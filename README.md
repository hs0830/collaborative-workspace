# 🚀 Team Collaborative Workspace

팀 프로젝트용 실시간 협업 툴입니다. 칸반, 공동 문서 편집, 채팅, 캘린더, 데이터셋 공유를 한곳에서 할 수 있어요.

| 기능 | 설명 |
|---|---|
| 📊 대시보드 | 칸반·캘린더 데이터로 진행률, 팀원별 분담, 다가오는 마감을 자동 계산 |
| 👥 팀원 관리 | 역할·이메일 관리, 칸반 담당자 이름으로 업무 자동 연결 |
| 📝 실시간 문서 | Tiptap + Yjs 공동 편집, 상대 커서 표시, Markdown·PDF 내보내기 |
| 🗒️ 회의록 | 회의별 공동 편집 문서, 기본 양식, 검색, 할 일을 칸반 카드로 바로 등록, 캘린더 표시 |
| 🏅 작업 기록 | 팀 작업물(참여자별 역할 기록)·개인 작업물 업로드(파일·링크·설명, 100MB) + 완료한 카드·참석한 회의·올린 데이터셋 자동 정리 |
| 📋 칸반 | 드래그 앤 드롭, 컬럼 추가·삭제, 태그 필터, 마감일 |
| 📅 캘린더 | 팀 일정 + 칸반 마감일 자동 표시 |
| 💾 데이터셋 | 최대 1GB 파일을 저장소(R2)에 직접 업로드, 팀 공유 |
| 💬 채팅 | 실시간 메시지, 20MB 첨부, 이미지 미리보기 |
| 🔔 알림 | 3일 이내 마감·지난 마감 자동 알림 |

**구성:** `client/` Next.js 14 (Vercel) · `server/` Express + Socket.IO + Yjs (Render) · DB는 Supabase(PostgreSQL) · 파일은 Cloudflare R2

---

## 1. 로컬에서 실행하기

외부 서비스 없이 바로 실행됩니다. 이때 데이터는 서버 메모리에 저장되고, 파일은 `server/uploads/` 폴더에 저장돼요.

```bash
# 터미널 1 — 서버 (http://localhost:4000)
cd server
npm install
npm run dev

# 터미널 2 — 클라이언트 (http://localhost:3000)
cd client
cp .env.example .env.local
npm install
npm run dev
```

브라우저에서 http://localhost:3000 에 접속한 뒤 **초대 코드 `team1234`** 와 이름을 입력하면 됩니다.
(Node.js 20.12 이상 필요)

> 메모리 모드에서는 서버를 재시작하면 데이터가 초기화됩니다. 계속 쓰려면 아래 2번을 설정하세요.

---

## 2. 외부 서비스 연결

`server/.env.example` 을 `server/.env` 로 복사해서 값을 채우면 됩니다. 비워 둔 항목은 로컬 모드로 동작해요.

### 2-1. 로그인 (필수)

```env
TEAM_INVITE_CODE=팀원에게_공유할_코드
AUTH_SECRET=아무_긴_무작위_문자열
```
`AUTH_SECRET` 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

- 초대 코드를 아는 사람만 입장할 수 있어요. 처음 입장하면 팀원으로 자동 등록됩니다.
- 코드를 바꾸면 새로 들어오는 사람만 영향을 받아요. 이미 로그인한 사람까지 모두 내보내려면 `AUTH_SECRET` 도 바꾸세요.

### 2-2. Supabase (DB)

1. https://supabase.com 에서 새 프로젝트를 만듭니다. 리전은 Seoul(ap-northeast-2)을 추천해요.
2. 상단의 **Connect** 버튼 → **Session pooler** 연결 문자열(URI)을 복사합니다.
3. `[YOUR-PASSWORD]` 부분을 프로젝트 비밀번호로 바꿔서 넣습니다.
   ```env
   DATABASE_URL=postgresql://postgres.xxxx:비밀번호@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
   ```
4. 서버를 실행하면 테이블이 자동으로 만들어집니다 (`server/db/schema.sql`).

> "Direct connection" 주소는 IPv6 전용이라 Render에서 접속이 안 될 수 있어요. 반드시 **Session pooler** 주소를 쓰세요.

### 2-3. Cloudflare R2 (파일 저장소)

1. Cloudflare 대시보드 → **R2** → 버킷을 만듭니다 (예: `collab-files`).
2. **R2 → Manage API tokens → Create API token** → 권한을 **Object Read & Write** 로 하고, 대상 버킷을 지정합니다.
3. 발급된 값을 넣습니다.
   ```env
   R2_ACCOUNT_ID=계정ID          # R2 개요 페이지 오른쪽에 표시
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=collab-files
   ```
4. **버킷 → Settings → CORS Policy** 에 아래 내용을 넣습니다. 브라우저가 R2로 직접 업로드하기 때문에 꼭 필요해요.
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://내-앱.vercel.app"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   CORS가 빠지면 업로드할 때 "업로드 중 연결이 끊겼습니다" 오류가 납니다.

---

## 3. 배포하기

### 서버 → Render

1. **New → Web Service** → GitHub 저장소를 연결합니다.
2. 아래처럼 설정합니다.
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Environment** 에 위 2번의 값과 함께 아래 값도 넣습니다.
   ```env
   NODE_ENV=production
   CLIENT_ORIGIN=https://내-앱.vercel.app
   ```
   `NODE_ENV=production` 이면 `TEAM_INVITE_CODE`, `AUTH_SECRET` 이 없을 때 서버가 시작되지 않아요. 실수로 개발용 코드로 배포되는 것을 막기 위한 장치입니다.
4. 배포 후 `https://(서버주소)/health` 에 접속해서 `"db":true,"storage":"r2"` 가 보이면 정상입니다.

> Render 무료 플랜은 약 15분 동안 요청이 없으면 잠들고, 다시 깨어나는 데 1분 정도 걸립니다. 데이터는 Supabase와 R2에 있으므로 잠들어도 사라지지 않아요.

### 클라이언트 → Vercel

1. **Add New → Project** → 같은 저장소를 고르고 **Root Directory** 를 `client` 로 지정합니다.
2. **Environment Variables** 에 서버 주소를 넣습니다.
   ```env
   NEXT_PUBLIC_SERVER_URL=https://collaborative-workspace-w24r.onrender.com
   ```
3. 배포한 뒤, Vercel 주소를 Render의 `CLIENT_ORIGIN` 과 R2 CORS에 넣었는지 다시 확인하세요.

---

## 4. 폴더 구조

```
client/
  app/                 각 화면 (대시보드, team, work, editor, meetings, kanban, calendar, datasets, chat, login)
  components/          AppShell(로그인 확인), Sidebar, KanbanBoard, ChatRoom, CollaborativeEditor, DatasetUploader
  lib/
    auth.ts            로그인 토큰, API 호출
    socket.ts          Socket.IO 연결, 서버 상태 구독(useSynced)
    files.ts           파일 업로드·다운로드
    useKanban.ts, types.ts, date.ts, config.ts
server/
  index.js             HTTP API, Socket.IO, Yjs WebSocket
  store.js             데이터 관리 (메모리 + DB 기록)
  storage.js           파일 저장소 (R2 / 로컬)
  auth.js, config.js, yjs.js
  db/schema.sql        DB 테이블
```

## 5. 동작 방식 요약

- **칸반·캘린더·팀원·채팅:** 클라이언트는 "무엇을 바꿀지"만 서버에 보내고, 서버가 검증·저장한 뒤 모든 사람에게 최신 상태를 보냅니다. 그래서 여러 명이 동시에 수정해도 화면이 어긋나지 않아요.
- **문서:** Yjs(CRDT)가 동시 입력을 자동으로 합치고, 서버가 2초마다 DB에 저장합니다.
- **파일:** 서버는 업로드·다운로드 링크만 발급하고, 실제 파일은 브라우저와 R2가 직접 주고받습니다. 덕분에 서버 메모리나 대역폭과 상관없이 1GB 파일도 올릴 수 있어요.
