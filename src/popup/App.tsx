import { Badge, Button, Input, Space, Tag, Tooltip, Typography } from 'antd';
import { useEffect, useState } from 'react';

import type { PopupToWorker } from '../shared/messages';
import type { StoredEntry } from './types';

const { Text } = Typography;

const METHOD_COLORS: Record<string, string> = {
  GET: '#52c41a',
  POST: '#1677ff',
  PUT: '#fa8c16',
  PATCH: '#faad14',
  DELETE: '#ff4d4f',
};

function methodColor(m: string) {
  return METHOD_COLORS[m.toUpperCase()] ?? '#8c8c8c';
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > 72 ? path.slice(0, 72) + '…' : path;
  } catch {
    return url.slice(0, 72);
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function statusColor(code: number) {
  if (code < 300) return '#52c41a';
  if (code < 400) return '#faad14';
  return '#ff4d4f';
}

export function App() {
  const [filterUrl, setFilterUrl] = useState('');
  const [entries, setEntries] = useState<StoredEntry[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [responseEdits, setResponseEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    console.log('[RF:popup] mount');
    chrome.storage.local.get(['filterUrl', 'entries'], (result) => {
      console.log('[RF:popup] loaded:', result);
      if (result.filterUrl != null) setFilterUrl(result.filterUrl as string);
      if (result.entries != null) {
        // Drop stale entries from old builds that lack the status field
        const fresh = (result.entries as StoredEntry[]).filter((e) => e.status != null);
        console.log(
          `[RF:popup] entries: ${(result.entries as StoredEntry[]).length} total, ${fresh.length} valid`,
        );
        setEntries(fresh);
      }
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.entries) {
        const next = (changes.entries.newValue as StoredEntry[]) ?? [];
        console.log(`[RF:popup] entries updated: ${next.length}`);
        setEntries(next);
      }
      if (changes.filterUrl) setFilterUrl(changes.filterUrl.newValue as string);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleFilterChange = (value: string) => {
    setFilterUrl(value);
    void chrome.storage.local.set({ filterUrl: value });
  };

  const handleClear = () => {
    setEntries([]);
    setEdits({});
    setResponseEdits({});
    void chrome.storage.local.set({ entries: [] });
  };

  const handleProceed = (entry: StoredEntry) => {
    const msg: PopupToWorker = {
      type: 'PROCEED',
      entry,
      editedBody: edits[entry.id],
    };
    void chrome.runtime.sendMessage(msg);
  };

  const handleApplyResponse = (entry: StoredEntry) => {
    const msg: PopupToWorker = {
      type: 'APPLY_RESPONSE',
      entryId: entry.id,
      editedBody: responseEdits[entry.id],
    };
    void chrome.runtime.sendMessage(msg);
  };

  const pendingCount = entries.filter((e) => e.status === 'pending').length;

  return (
    <div
      style={{
        width: 800,
        height: 540,
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f5f5',
        overflow: 'auto',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: '8px 12px',
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Input
          placeholder="URL паттерн (например: getMsgDialogues)"
          value={filterUrl}
          onChange={(e) => handleFilterChange(e.target.value)}
          style={{ flex: 1 }}
          allowClear
          size="small"
        />
        {pendingCount > 0 && (
          <Badge count={pendingCount} color="#faad14" title={`${pendingCount} запросов ожидают`} />
        )}
        <Button size="small" onClick={handleClear} disabled={entries.length === 0}>
          Очистить
        </Button>
      </div>

      {/* Entries */}
      <div
        style={{
          flex: 1,
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {entries.length === 0 && (
          <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
            Нет записей. Установите URL-паттерн и выполните запрос на вкладке.
          </div>
        )}

        {entries.map((entry) => {
          const isPending = entry.status === 'pending';
          const isResponsePending = entry.status === 'response_pending';
          const body = edits[entry.id] ?? entry.requestBody ?? '';

          return (
            <div
              key={entry.id}
              style={{
                background: '#fff',
                border: `1px solid ${isPending ? '#faad14' : isResponsePending ? '#722ed1' : '#e8e8e8'}`,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px',
                  background: isPending ? '#fffbe6' : isResponsePending ? '#f9f0ff' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <Tag
                  style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: 11,
                    color: '#fff',
                    background: methodColor(entry.method),
                    border: 'none',
                    padding: '0 6px',
                    lineHeight: '20px',
                    borderRadius: 3,
                  }}
                >
                  {entry.method}
                </Tag>

                <Tooltip title={entry.url}>
                  <Text
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      flex: 1,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shortUrl(entry.url)}
                  </Text>
                </Tooltip>

                <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  {hostOf(entry.url)}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  {formatTime(entry.timestamp)}
                </Text>

                {isPending ? (
                  <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
                    ● PENDING
                  </Tag>
                ) : entry.status === 'sent' ? (
                  <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
                    ⟳ SENT
                  </Tag>
                ) : entry.status === 'response_pending' ? (
                  <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                    ← {entry.responseStatus ?? '?'} HOLD
                  </Tag>
                ) : (
                  entry.responseStatus != null && (
                    <Tag
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: '#fff',
                        background: statusColor(entry.responseStatus),
                        border: 'none',
                      }}
                    >
                      ← {entry.responseStatus}
                    </Tag>
                  )
                )}
              </div>

              {/* Body */}
              <div style={{ padding: '6px 10px' }}>
                {/* Request body */}
                {(body || isPending) && (
                  <div style={{ marginBottom: 6 }}>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11, display: 'block', marginBottom: 2 }}
                    >
                      Request body:
                    </Text>
                    <textarea
                      value={body}
                      readOnly={!isPending}
                      onChange={(e) => setEdits((p) => ({ ...p, [entry.id]: e.target.value }))}
                      rows={3}
                      style={{
                        width: '100%',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        border: `1px solid ${isPending ? '#faad14' : '#e8e8e8'}`,
                        borderRadius: 4,
                        padding: '4px 6px',
                        background: isPending ? '#fffbe6' : '#f9f9f9',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {/* Response body */}
                {(entry.responseBody || isResponsePending) && (
                  <div style={{ marginBottom: 4 }}>
                    <Space size={6} style={{ marginBottom: 2 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Response body:
                      </Text>
                      {entry.responseHeaders?.['content-type'] && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {entry.responseHeaders['content-type'].split(';')[0]}
                        </Text>
                      )}
                    </Space>
                    <textarea
                      value={responseEdits[entry.id] ?? entry.responseBody ?? ''}
                      readOnly={!isResponsePending}
                      onChange={(e) =>
                        setResponseEdits((p) => ({ ...p, [entry.id]: e.target.value }))
                      }
                      rows={3}
                      style={{
                        width: '100%',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        border: `1px solid ${isResponsePending ? '#722ed1' : '#e8e8e8'}`,
                        borderRadius: 4,
                        padding: '4px 6px',
                        background: isResponsePending ? '#f9f0ff' : '#f9f9f9',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {/* Send button */}
                {isPending && (
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <Button type="primary" size="small" onClick={() => handleProceed(entry)}>
                      Send →
                    </Button>
                  </div>
                )}

                {/* Apply response button */}
                {isResponsePending && (
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <Button
                      type="primary"
                      size="small"
                      style={{ background: '#722ed1', borderColor: '#722ed1' }}
                      onClick={() => handleApplyResponse(entry)}
                    >
                      Apply →
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
