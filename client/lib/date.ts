// 날짜 계산은 모두 브라우저의 현지 시간(한국이면 KST) 기준입니다.
// new Date().toISOString() 은 UTC 라서 한국 오전 9시 이전에는 날짜가 하루 밀리므로 쓰지 않습니다.

export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayStr = () => toDateStr(new Date());

/** 오늘부터 해당 날짜(YYYY-MM-DD)까지 남은 일수. 지났으면 음수 */
export function daysUntil(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
