// 파일 저장소.
// - R2_* 환경변수가 있으면 Cloudflare R2 사용: 브라우저가 R2로 "직접" 업로드/다운로드 (서버를 거치지 않아 1GB도 가능)
// - 없으면 server/uploads 폴더에 저장 (개발용). 사용하는 쪽 코드는 두 방식 모두 똑같습니다.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const config = require('./config');
const auth = require('./auth');

const UPLOAD_TTL = 60 * 60; // 업로드 링크 유효 시간 1시간
const DOWNLOAD_TTL = 15 * 60; // 다운로드 링크 유효 시간 15분

/** 저장소 안에서 쓸 파일 경로. 원본 이름은 DB에만 저장하고 여기엔 무작위 이름 사용 */
function makeKey(kind, originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  return `${kind}/${month}/${crypto.randomUUID()}${ext}`;
}

const contentDisposition = (name, inline) =>
  `${inline ? 'inline' : 'attachment'}; filename="${name.replace(/[^\x20-\x7e]|"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`;

// ───────────────────────── Cloudflare R2 ─────────────────────────
function createR2Driver() {
  const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const { accountId, accessKeyId, secretAccessKey, bucket } = config.r2;

  const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(process.env.R2_ENDPOINT), // 테스트용 S3 호환 서버 사용 시
    // 최신 AWS SDK는 업로드 링크에 '빈 파일'의 체크섬을 넣어 R2가 브라우저 업로드를 거부하므로 끔
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return {
    name: 'r2',
    async uploadUrl(file) {
      const cmd = new PutObjectCommand({ Bucket: bucket, Key: file.storageKey, ContentType: file.contentType });
      return getSignedUrl(s3, cmd, { expiresIn: UPLOAD_TTL });
    },
    async downloadUrl(file, inline) {
      const cmd = new GetObjectCommand({
        Bucket: bucket,
        Key: file.storageKey,
        ResponseContentDisposition: contentDisposition(file.name, inline),
      });
      return getSignedUrl(s3, cmd, { expiresIn: DOWNLOAD_TTL });
    },
    async size(file) {
      try {
        const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: file.storageKey }));
        return Number(res.ContentLength);
      } catch {
        return null; // 업로드되지 않음
      }
    },
    async remove(file) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.storageKey })).catch(() => {});
    },
  };
}

// ───────────────────────── 로컬 디스크 (개발용) ─────────────────────────
const LOCAL_DIR = path.join(__dirname, 'uploads');

function createLocalDriver() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const filePath = (file) => path.join(LOCAL_DIR, file.storageKey.replace(/\//g, '_'));

  return {
    name: 'local',
    filePath,
    async uploadUrl(file) {
      const sig = auth.sign({ typ: 'up', fid: file.id }, UPLOAD_TTL);
      return `${config.publicUrl}/api/local-files/${file.id}?sig=${sig}`;
    },
    async downloadUrl(file, inline) {
      const sig = auth.sign({ typ: inline ? 'view' : 'down', fid: file.id }, DOWNLOAD_TTL);
      return `${config.publicUrl}/api/local-files/${file.id}?sig=${sig}`;
    },
    async size(file) {
      try {
        return fs.statSync(filePath(file)).size;
      } catch {
        return null;
      }
    },
    async remove(file) {
      fs.promises.unlink(filePath(file)).catch(() => {});
    },
  };
}

const driver = config.r2.enabled ? createR2Driver() : createLocalDriver();

/**
 * 로컬 디스크 모드에서 업로드(PUT)·다운로드(GET)를 처리하는 라우트를 등록합니다.
 * R2 모드에서는 브라우저가 R2와 직접 통신하므로 필요 없습니다.
 */
function mountLocalRoutes(app, store) {
  if (driver.name !== 'local') return;

  app.put('/api/local-files/:id', async (req, res) => {
    const p = auth.verify(req.query.sig);
    const file = store.getFile(req.params.id);
    if (!p || p.typ !== 'up' || p.fid !== req.params.id || !file) return res.status(403).end();

    const limit = config.limits[file.kind] ?? 0;
    let received = 0;
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > limit) req.destroy(new Error('too large'));
    });
    try {
      await pipeline(req, fs.createWriteStream(driver.filePath(file)));
      res.status(200).end();
    } catch {
      driver.remove(file);
      if (!res.headersSent) res.status(413).end();
    }
  });

  app.get('/api/local-files/:id', (req, res) => {
    const p = auth.verify(req.query.sig);
    const file = store.getFile(req.params.id);
    if (!p || !['down', 'view'].includes(p.typ) || p.fid !== req.params.id || !file) return res.status(403).end();

    const inline = p.typ === 'view' && /^image\/(png|jpe?g|gif|webp)$/.test(file.contentType);
    res.setHeader('Content-Type', inline ? file.contentType : 'application/octet-stream');
    res.setHeader('Content-Disposition', contentDisposition(file.name, inline));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(driver.filePath(file), (err) => err && !res.headersSent && res.status(404).end());
  });
}

module.exports = { driver, makeKey, mountLocalRoutes };
