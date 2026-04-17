export const headersArrayToObject = (
  headers: Array<{ name: string; value: string }>,
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const { name, value } of headers) {
    const key = name.toLowerCase();
    result[key] = result[key] ? `${result[key]}, ${value}` : value;
  }
  return result;
};

export const stringToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

export const base64ToString = (b64: string): string => {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
