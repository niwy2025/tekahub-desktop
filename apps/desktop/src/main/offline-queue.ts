import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CreateSalePayload,
  FlushOfflineQueueResult,
  OfflineQueueState,
  OfflineQueuedSale,
  Sale,
} from "@teka/shared";
import { ApiError, apiRequest } from "./api-client";
import { getAppPaths } from "./paths";

const FILE = "offline-sales-queue.json";

type QueueFile = {
  next_sequence: number;
  items: OfflineQueuedSale[];
  last_flush_at: string | null;
  last_error: string | null;
};

type SyncPushResult = {
  results?: Array<{
    operation_id: string;
    status: string;
    error_message?: string | null;
    response?: { data?: Sale } | null;
  }>;
};

let flushing = false;
let changeHandler: ((state: OfflineQueueState) => void) | null = null;

function queuePath(): string {
  const dir = getAppPaths().cache;
  mkdirSync(dir, { recursive: true });
  return join(dir, FILE);
}

function emptyFile(): QueueFile {
  return { next_sequence: 1, items: [], last_flush_at: null, last_error: null };
}

function readFile(): QueueFile {
  const file = queuePath();
  if (!existsSync(file)) return emptyFile();
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<QueueFile>;
    return {
      next_sequence: Number(parsed.next_sequence) > 0 ? Number(parsed.next_sequence) : 1,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      last_flush_at: typeof parsed.last_flush_at === "string" ? parsed.last_flush_at : null,
      last_error: typeof parsed.last_error === "string" ? parsed.last_error : null,
    };
  } catch {
    return emptyFile();
  }
}

function writeFile(data: QueueFile): void {
  writeFileSync(queuePath(), JSON.stringify(data, null, 2), "utf8");
  changeHandler?.(getOfflineQueueState());
}

export function setOfflineQueueChangeHandler(
  handler: ((state: OfflineQueueState) => void) | null,
): void {
  changeHandler = handler;
}

export function getOfflineQueueState(): OfflineQueueState {
  const data = readFile();
  return {
    pending: data.items.length,
    items: data.items,
    lastFlushAt: data.last_flush_at,
    lastError: data.last_error,
    flushing,
  };
}

export function isNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /TEKA_NET:|ERR_NETWORK|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|fetch failed/i.test(
    err.message,
  );
}

function estimateTotal(payload: CreateSalePayload): number {
  return payload.lignes.reduce((sum, line) => {
    const unit = Number(line.prix_unitaire ?? 0) || 0;
    return sum + unit * (Number(line.quantite) || 0);
  }, 0);
}

function toLocalSale(item: OfflineQueuedSale): Sale {
  const total = estimateTotal(item.payload);
  const paid = Math.min(Number(item.payload.montant_paye_initial ?? total) || total, total);
  return {
    id: item.entity_id,
    reference: `OFF-${item.entity_id.slice(0, 8).toUpperCase()}`,
    date_vente: item.created_at,
    statut: "en_attente_sync",
    moyen_paiement: item.payload.moyen_paiement,
    montant_total: total,
    montant_paye: paid,
    montant_restant: Math.max(0, total - paid),
    client_nom: item.payload.client_nom ?? null,
    client_telephone: item.payload.client_telephone ?? null,
    offline_queued: true,
    items: item.payload.lignes.map((line) => ({
      produit_id: line.produit_id,
      quantite: line.quantite,
      prix_unitaire: line.prix_unitaire,
      total_ligne: (Number(line.prix_unitaire ?? 0) || 0) * (Number(line.quantite) || 0),
    })),
  };
}

/** Enfile une vente pour sync/push et retourne une vente locale. */
export function enqueueOfflineSale(payload: CreateSalePayload): Sale {
  const data = readFile();
  const item: OfflineQueuedSale = {
    operation_id: randomUUID(),
    entity_id: randomUUID(),
    client_sequence: data.next_sequence,
    created_at: new Date().toISOString(),
    payload,
    last_error: null,
  };
  data.next_sequence += 1;
  data.items.push(item);
  data.last_error = null;
  writeFile(data);
  return toLocalSale(item);
}

async function pushViaSync(items: OfflineQueuedSale[]): Promise<SyncPushResult> {
  return apiRequest<SyncPushResult>("/api/pos/v1/sync/push", {
    method: "POST",
    body: {
      operations: items.map((item) => ({
        operation_id: item.operation_id,
        client_sequence: item.client_sequence,
        entity: "ventes",
        action: "create",
        entity_id: item.entity_id,
        client_timestamp: item.created_at,
        payload: {
          ...item.payload,
          id: item.entity_id,
        },
      })),
    },
  });
}

async function pushViaClassicApi(item: OfflineQueuedSale): Promise<void> {
  await apiRequest("/api/ventes", {
    method: "POST",
    body: item.payload,
  });
}

/**
 * Envoie la file via /api/pos/v1/sync/push (idempotent).
 * Fallback POST /api/ventes si appareil POS absent (409).
 */
export async function flushOfflineQueue(): Promise<FlushOfflineQueueResult> {
  if (flushing) {
    const state = getOfflineQueueState();
    return { flushed: 0, remaining: state.pending, failed: 0, error: null };
  }

  const data = readFile();
  if (data.items.length === 0) {
    return { flushed: 0, remaining: 0, failed: 0, error: null };
  }

  flushing = true;
  changeHandler?.(getOfflineQueueState());

  let flushed = 0;
  let failed = 0;
  let error: string | null = null;

  try {
    try {
      const response = await pushViaSync(data.items);
      const results = Array.isArray(response?.results) ? response.results : [];
      const byId = new Map(results.map((r) => [r.operation_id, r]));
      const remaining: OfflineQueuedSale[] = [];

      for (const item of data.items) {
        const result = byId.get(item.operation_id);
        if (!result) {
          remaining.push(item);
          continue;
        }
        if (result.status === "applied") {
          flushed += 1;
          continue;
        }
        if (result.status === "failed") {
          failed += 1;
          remaining.push({
            ...item,
            last_error: result.error_message ?? "sync_failed",
          });
          error = result.error_message ?? error;
          continue;
        }
        remaining.push(item);
      }

      data.items = remaining;
      data.last_flush_at = new Date().toISOString();
      data.last_error = error;
      writeFile(data);
    } catch (err) {
      const isDeviceMissing =
        err instanceof ApiError &&
        err.status === 409 &&
        /POS_DEVICE|appareil/i.test(err.message);

      if (!isDeviceMissing) throw err;

      // Fallback : rejouer une à une via l’API ventes classique.
      const remaining: OfflineQueuedSale[] = [];
      let stop = false;
      for (const item of data.items) {
        if (stop) {
          remaining.push(item);
          continue;
        }
        try {
          await pushViaClassicApi(item);
          flushed += 1;
        } catch (oneErr) {
          if (isNetworkFailure(oneErr)) {
            remaining.push(item);
            stop = true;
            error = oneErr instanceof Error ? oneErr.message : String(oneErr);
            continue;
          }
          failed += 1;
          remaining.push({
            ...item,
            last_error: oneErr instanceof Error ? oneErr.message : String(oneErr),
          });
          error = oneErr instanceof Error ? oneErr.message : String(oneErr);
        }
      }
      data.items = remaining;
      data.last_flush_at = new Date().toISOString();
      data.last_error = error;
      writeFile(data);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    data.last_error = error;
    writeFile(data);
  } finally {
    flushing = false;
    changeHandler?.(getOfflineQueueState());
  }

  return {
    flushed,
    remaining: readFile().items.length,
    failed,
    error,
  };
}
