// 회의록 화면에서 같이 쓰는 도우미

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026-10-06' → '10월 6일 (화)' */
export function formatMeetingDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

/** 수정 시각을 '방금 전', '5분 전' 처럼 표시 */
export function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return '방금 전';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

/** 새 회의록에 미리 채워 넣는 기본 양식 */
export const MEETING_TEMPLATE = `
<h2>📌 안건</h2>
<ul><li><p></p></li></ul>
<h2>💬 논의 내용</h2>
<p></p>
<h2>✅ 결정 사항</h2>
<ul><li><p></p></li></ul>
<h2>📋 할 일</h2>
<ul><li><p></p></li></ul>
`;
