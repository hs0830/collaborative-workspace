// 실시간 문서(Yjs) 저장/복원.
// 문서가 바뀌면 2초 뒤에 한 번 저장하고(연속 입력은 묶어서), 마지막 사람이 나가면 즉시 저장합니다.
// DATABASE_URL 이 있으면 DB에, 없으면 서버 메모리에 보관합니다.
const Y = require('yjs');
const { setPersistence } = require('y-websocket/bin/utils');
const { pool } = require('./db');

const SAVE_DELAY = 2000;

// 저장 위치: DB 또는 메모리
const memory = new Map();
const backend = pool
  ? {
      load: async (name) => (await pool.query('select state from yjs_documents where name = $1', [name])).rows[0]?.state ?? null,
      save: (name, state) =>
        pool.query(
          `insert into yjs_documents (name, state, updated_at) values ($1, $2, now())
           on conflict (name) do update set state = excluded.state, updated_at = now()`,
          [name, state]
        ),
    }
  : {
      load: async (name) => memory.get(name) ?? null,
      save: async (name, state) => void memory.set(name, state),
    };

/** 문서 본문에서 제목(heading)을 뺀 글자만 뽑기 — 회의록 목록 미리보기용 */
function extractText(ydoc) {
  const parts = [];
  ydoc.getXmlFragment('content').forEach((node) => {
    if (node instanceof Y.XmlElement && node.nodeName === 'heading') return;
    const text = node
      .toString()
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) parts.push(text);
  });
  return parts.join(' · ');
}

/**
 * @param {(docName: string, text: () => string) => void} onSaved 문서가 저장된 뒤 호출 (회의록 미리보기 갱신용)
 * @param {(docName: string) => boolean} shouldSave false 면 저장하지 않음 (삭제된 회의록 등)
 */
function setupYjsPersistence(onSaved = () => {}, shouldSave = () => true) {
  if (!pool) console.warn('⚠️  DATABASE_URL 미설정 → 실시간 문서는 서버 메모리에만 보관됩니다.');

  const timers = new Map();

  const save = async (docName, ydoc) => {
    if (!shouldSave(docName)) return;
    try {
      await backend.save(docName, Buffer.from(Y.encodeStateAsUpdate(ydoc)));
      onSaved(docName, () => extractText(ydoc));
    } catch (err) {
      console.error('문서 저장 실패:', docName, err.message);
    }
  };

  setPersistence({
    provider: null,
    bindState: async (docName, ydoc) => {
      try {
        const state = await backend.load(docName);
        if (state) Y.applyUpdate(ydoc, new Uint8Array(state));
      } catch (err) {
        console.error('문서 불러오기 실패:', docName, err.message);
      }

      ydoc.on('update', () => {
        clearTimeout(timers.get(docName));
        timers.set(
          docName,
          setTimeout(() => {
            timers.delete(docName);
            save(docName, ydoc);
          }, SAVE_DELAY)
        );
      });
    },
    writeState: async (docName, ydoc) => {
      clearTimeout(timers.get(docName));
      timers.delete(docName);
      await save(docName, ydoc);
    },
  });
}

/** 문서를 보고 있는 사람들의 연결을 끊고 메모리에서 지움 (회의록 삭제 시) */
function closeDoc(docName) {
  const { docs } = require('y-websocket/bin/utils');
  const doc = docs.get(docName);
  if (!doc) return;
  doc.conns.forEach((_, conn) => conn.close());
  memory.delete(docName);
}

module.exports = { setupYjsPersistence, closeDoc };
