// 초대 코드 로그인과 토큰 서명·검증.
// 토큰 형식: base64url(JSON payload) + "." + HMAC-SHA256 서명  (JWT 와 비슷한 간단한 구조)
const crypto = require('crypto');
const config = require('./config');

const TOKEN_DAYS = 30;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (data) => crypto.createHmac('sha256', config.authSecret).update(data).digest('base64url');

function sign(payload, ttlSeconds) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${body}.${hmac(body)}`;
}

function verify(token) {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = hmac(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 로그인 토큰 (사용자 id만 담음. 이름 등은 매번 DB에서 최신값 조회) */
const signUserToken = (memberId) => sign({ sub: memberId, typ: 'user' }, TOKEN_DAYS * 24 * 3600);
const verifyUserToken = (token) => {
  const p = verify(token);
  return p && p.typ === 'user' ? p.sub : null;
};

/** 초대 코드 비교 (시간차 공격 방지) */
function checkInviteCode(code) {
  if (typeof code !== 'string') return false;
  const a = crypto.createHash('sha256').update(code.trim()).digest();
  const b = crypto.createHash('sha256').update(config.inviteCode).digest();
  return crypto.timingSafeEqual(a, b);
}

// 로그인 시도 제한: IP 당 1분에 10회
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 10;
}

/** Authorization: Bearer <token> 헤더에서 사용자 id 추출 */
function tokenFromRequest(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

module.exports = { sign, verify, signUserToken, verifyUserToken, checkInviteCode, tooManyAttempts, tokenFromRequest };
