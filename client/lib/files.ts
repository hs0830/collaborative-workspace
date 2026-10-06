'use client';

import { useEffect, useState } from 'react';
import { api, getToken } from './auth';
import type { StoredFile } from './types';

export const LIMITS = { chat: 20 * 1024 * 1024, dataset: 1024 * 1024 * 1024 } as const;

export const formatSize = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)}GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
};

/**
 * 파일 업로드: ① 서버에서 업로드 링크 발급 → ② 브라우저가 저장소(R2)로 직접 전송 → ③ 서버에 완료 알림
 * 서버를 거치지 않으므로 큰 파일도 올릴 수 있고, 실제 전송량으로 진행률을 표시합니다.
 */
export async function uploadFile(
  kind: 'chat' | 'dataset',
  file: File,
  onProgress?: (percent: number) => void
): Promise<StoredFile> {
  if (file.size > LIMITS[kind]) throw new Error(`파일 용량은 최대 ${kind === 'chat' ? '20MB' : '1GB'}입니다.`);

  const { fileId, uploadUrl, contentType } = await api<{ fileId: string; uploadUrl: string; contentType: string }>(
    '/api/files',
    { method: 'POST', body: JSON.stringify({ kind, name: file.name, size: file.size, contentType: file.type }) }
  );

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`업로드 실패 (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('업로드 중 연결이 끊겼습니다. 저장소 CORS 설정을 확인하세요.'));
    xhr.send(file);
  });

  const { file: stored } = await api<{ file: StoredFile }>(`/api/files/${fileId}/complete`, { method: 'POST' });
  return stored;
}

/** 다운로드 링크(짧은 시간만 유효)를 받아 바로 다운로드 */
export async function downloadFile(fileId: string) {
  const { url } = await api<{ url: string }>(`/api/files/${fileId}/url`);
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  a.click();
}

// 이미지 미리보기 링크 캐시 (링크는 15분 유효 → 10분 동안 재사용)
const urlCache = new Map<string, { url: string; at: number }>();

/** 채팅 이미지 미리보기용 링크 */
export function useFileViewUrl(fileId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (fileId && urlCache.get(fileId)?.url) || null);

  useEffect(() => {
    if (!fileId || !getToken()) return;
    const hit = urlCache.get(fileId);
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) {
      setUrl(hit.url);
      return;
    }
    let alive = true;
    api<{ url: string }>(`/api/files/${fileId}/url?inline=1`)
      .then(({ url }) => {
        urlCache.set(fileId, { url, at: Date.now() });
        if (alive) setUrl(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fileId]);

  return url;
}
