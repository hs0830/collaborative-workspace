// 백엔드 서버 주소. client/.env.local 의 NEXT_PUBLIC_SERVER_URL 로 설정합니다.
export const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '');

// Yjs WebSocket 주소 (http → ws, https → wss)
export const YJS_URL = `${SERVER_URL.replace(/^http/, 'ws')}/yjs`;
