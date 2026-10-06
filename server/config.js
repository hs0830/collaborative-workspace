// 환경변수 한곳에서 읽기. 값의 의미는 server/.env.example 참고.
try {
  // Node 20.12+ : server/.env 파일이 있으면 자동으로 읽음
  process.loadEnvFile?.(require('path').join(__dirname, '.env'));
} catch {
  /* .env 파일이 없으면 무시 */
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const config = {
  isProd,
  port: Number(env.PORT) || 4000,
  allowedOrigins: (env.CLIENT_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // 로그인
  inviteCode: env.TEAM_INVITE_CODE || '',
  authSecret: env.AUTH_SECRET || '',

  // DB (Supabase 의 Postgres 연결 문자열). 비어 있으면 메모리 저장
  databaseUrl: env.DATABASE_URL || '',

  // 파일 저장소 (Cloudflare R2). 비어 있으면 server/uploads 폴더에 저장
  r2: {
    accountId: env.R2_ACCOUNT_ID || '',
    accessKeyId: env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
    bucket: env.R2_BUCKET || '',
  },

  // 서버 자신의 공개 주소 (로컬 디스크 저장 시 다운로드 링크 생성용)
  publicUrl: (env.PUBLIC_SERVER_URL || `http://localhost:${Number(env.PORT) || 4000}`).replace(/\/$/, ''),

  limits: {
    chat: 20 * 1024 * 1024, // 20MB
    dataset: 1024 * 1024 * 1024, // 1GB
    work: 100 * 1024 * 1024, // 100MB (작업 기록)
  },
};

config.r2.enabled = Boolean(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucket);

// 개발 편의를 위한 기본값. 배포 환경에서는 반드시 설정해야 함
if (!config.inviteCode) {
  if (isProd) throw new Error('TEAM_INVITE_CODE 환경변수를 설정하세요.');
  config.inviteCode = 'team1234';
  console.warn('⚠️  TEAM_INVITE_CODE 미설정 → 개발용 초대 코드 "team1234" 사용');
}
if (!config.authSecret) {
  if (isProd) throw new Error('AUTH_SECRET 환경변수를 설정하세요.');
  config.authSecret = 'dev-only-secret';
  console.warn('⚠️  AUTH_SECRET 미설정 → 개발용 값 사용 (배포 시 반드시 설정)');
}

module.exports = config;
