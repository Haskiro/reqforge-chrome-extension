export const DIRECTION_FILTERS = [
  { text: 'Запрос', value: 'request' },
  { text: 'Ответ', value: 'response' },
];

export const METHOD_FILTERS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].map((m) => ({
  text: m,
  value: m,
}));

export const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};
