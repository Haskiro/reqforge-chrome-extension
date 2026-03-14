import type { TrafficEntry } from '../popup/types';

export type MessageType = 'PASS' | 'REJECT' | 'MODIFY' | 'TRAFFIC_ENTRY';

export type PopupMessage =
  | { type: 'PASS'; requestId: string }
  | { type: 'REJECT'; requestId: string }
  | { type: 'MODIFY'; requestId: string; body?: string; headers?: Record<string, string> };

export type WorkerMessage = { type: 'TRAFFIC_ENTRY'; entry: TrafficEntry };
