// 실시간 문서(Yjs)를 DB에 저장/복원합니다.
// 문서가 바뀌면 2초 뒤에 한 번 저장하고(연속 입력은 묶어서), 마지막 사람이 나가면 즉시 저장합니다.
const Y = require('yjs');
const { setPersistence } = require('y-websocket/bin/utils');
const { pool } = require('./db');

const SAVE_DELAY = 2000;

async function save(docName, ydoc) {
  const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
  await pool.query(
    `insert into yjs_documents (name, state, updated_at) values ($1, $2, now())
     on conflict (name) do update set state = excluded.state, updated_at = now()`,
    [docName, state]
  );
}

function setupYjsPersistence() {
  if (!pool) {
    console.warn('⚠️  DATABASE_URL 미설정 → 실시간 문서는 서버 메모리에만 보관됩니다.');
    return;
  }

  const timers = new Map();

  setPersistence({
    provider: null,
    bindState: async (docName, ydoc) => {
      try {
        const { rows } = await pool.query('select state from yjs_documents where name = $1', [docName]);
        if (rows[0]) Y.applyUpdate(ydoc, new Uint8Array(rows[0].state));
      } catch (err) {
        console.error('문서 불러오기 실패:', docName, err.message);
      }

      ydoc.on('update', () => {
        clearTimeout(timers.get(docName));
        timers.set(
          docName,
          setTimeout(() => {
            timers.delete(docName);
            save(docName, ydoc).catch((err) => console.error('문서 저장 실패:', docName, err.message));
          }, SAVE_DELAY)
        );
      });
    },
    writeState: async (docName, ydoc) => {
      clearTimeout(timers.get(docName));
      timers.delete(docName);
      await save(docName, ydoc).catch((err) => console.error('문서 저장 실패:', docName, err.message));
    },
  });
}

module.exports = { setupYjsPersistence };
