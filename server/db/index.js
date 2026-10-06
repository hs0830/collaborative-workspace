// PostgreSQL(Supabase) 연결. DATABASE_URL 이 없으면 null 을 내보내고, 각 모듈은 메모리 저장으로 동작합니다.
const fs = require('fs');
const path = require('path');
const config = require('../config');

let pool = null;

if (config.databaseUrl) {
  const { Pool } = require('pg');
  const isLocal = /localhost|127\.0\.0\.1|host=\/|@\/|%2F/.test(config.databaseUrl);
  pool = new Pool({
    connectionString: config.databaseUrl,
    // Supabase 는 SSL 필수
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  });
  pool.on('error', (err) => console.error('DB 연결 오류:', err.message));
}

/** 서버 시작 시 테이블 생성 */
async function migrate() {
  if (!pool) return;
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { pool, migrate };
