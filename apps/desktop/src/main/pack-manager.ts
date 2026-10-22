import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  createReadStream,
} from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { BrowserWindow } from "electron";
import extractZip from "extract-zip";
import {
  IpcChannels,
  isNewerVersion,
  type PackLocalState,
  type PackManifest,
  type PackUpdateState,
} from "@teka/shared";
import { verifyPackManifest } from "@teka/shared/crypto";
import { appConfig } from "./config";
import { getAppPaths, packCurrentLink, packVersionDir } from "./paths";

const packStates = new Map<string, PackUpdateState>();

function emit(win: BrowserWindow | null, state: PackUpdateState) {
  packStates.set(state.packId, state);
  if (win && !win.isDestroyed()) {
    win.webContents.send(IpcChannels.onPackUpdate, state);
  }
}

export function getPacksState(): PackUpdateState[] {
  return Array.from(packStates.values());
}

export function readLocalPack(packId: string): PackLocalState | null {
  const link = packCurrentLink(packId);
  if (!existsSync(link)) return null;
  try {
    return JSON.parse(readFileSync(link, "utf8")) as PackLocalState;
  } catch {
    return null;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
}

async function downloadToFile(
  url: string,
  dest: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  const file = createWriteStream(dest);
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      file.write(Buffer.from(value));
      received += value.byteLength;
      if (total > 0 && onProgress) {
        onProgress(Math.round((received / total) * 100));
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      file.end(() => resolve());
      file.on("error", reject);
    });
  }
}

function resolveManifestUrl(packId: string): string {
  const base = appConfig.packsUpdateUrl.replace(/\/$/, "");
  return `${base}/${packId}/manifest.json`;
}

export async function fetchPackManifest(packId: string): Promise<PackManifest> {
  const url = resolveManifestUrl(packId);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Manifest ${packId}: ${res.status}`);
  }
  return (await res.json()) as PackManifest;
}

/**
 * Check remote manifest; download + verify + atomic install if newer.
 * Layout: userData/packs/<id>/version-X/ + current.json pointer.
 */
export async function checkAndUpdatePack(
  packId: string,
  getWindow: () => BrowserWindow | null,
): Promise<PackLocalState | null> {
  if (appConfig.skipPackCheck || !appConfig.packsUpdateUrl) {
    const local = readLocalPack(packId);
    emit(getWindow(), {
      packId,
      status: "up-to-date",
      currentVersion: local?.version,
      message: local ? "À jour" : "Aucun pack (URL non configurée)",
    });
    return local;
  }

  try {
    emit(getWindow(), {
      packId,
      status: "checking",
      currentVersion: readLocalPack(packId)?.version,
      message: "Vérification des packs…",
    });

    const remote = await fetchPackManifest(packId);
    const local = readLocalPack(packId);
    if (local && !isNewerVersion(remote.version, local.version)) {
      emit(getWindow(), {
        packId,
        status: "up-to-date",
        currentVersion: local.version,
        message: "À jour",
      });
      return local;
    }
    return await installPackVerified(packId, remote, getWindow);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit(getWindow(), {
      packId,
      status: "error",
      currentVersion: readLocalPack(packId)?.version,
      error: message,
      message: "Erreur pack",
    });
    return readLocalPack(packId);
  }
}

async function installPackVerified(
  packId: string,
  remote: PackManifest,
  getWindow: () => BrowserWindow | null,
): Promise<PackLocalState> {
  const win = getWindow();
  const local = readLocalPack(packId);

  if (!appConfig.packsPublicKey) {
    throw new Error("PACKS_PUBLIC_KEY manquante — refus d'installer un pack non vérifiable");
  }

  if (
    !verifyPackManifest(
      appConfig.packsPublicKey,
      remote.id,
      remote.version,
      remote.sha256,
      remote.signature,
    )
  ) {
    throw new Error(`Signature invalide pour le pack ${packId}@${remote.version}`);
  }

  emit(win, {
    packId,
    status: "downloading",
    currentVersion: local?.version,
    availableVersion: remote.version,
    progress: 0,
    message: "Téléchargement…",
  });

  const cacheDir = join(getAppPaths().cache, packId);
  mkdirSync(cacheDir, { recursive: true });
  const archivePath = join(cacheDir, `${remote.version}.zip`);
  const archiveUrl = remote.url.startsWith("http")
    ? remote.url
    : `${appConfig.packsUpdateUrl.replace(/\/$/, "")}/${remote.url.replace(/^\//, "")}`;

  await downloadToFile(archiveUrl, archivePath, (pct) => {
    emit(win, {
      packId,
      status: "downloading",
      currentVersion: local?.version,
      availableVersion: remote.version,
      progress: pct,
      message: "Téléchargement…",
    });
  });

  const digest = await sha256File(archivePath);
  if (digest !== remote.sha256.toLowerCase()) {
    rmSync(archivePath, { force: true });
    throw new Error(`Hash SHA-256 invalide pour ${packId}@${remote.version}`);
  }

  const targetDir = packVersionDir(packId, remote.version);
  const tmpDir = `${targetDir}.tmp-${Date.now()}`;
  mkdirSync(join(getAppPaths().packs, packId), { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  try {
    await extractZip(archivePath, { dir: tmpDir });
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    renameSync(tmpDir, targetDir);
  } catch (err) {
    rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }

  const next: PackLocalState = {
    id: packId,
    version: remote.version,
    path: targetDir,
    entrypoint: remote.entrypoint,
    previousVersion: local?.version,
    previousPath: local?.path,
  };

  // Atomic pointer switch (tmp → rename)
  const linkPath = packCurrentLink(packId);
  const linkTmp = `${linkPath}.tmp`;
  writeFileSync(linkTmp, JSON.stringify(next, null, 2), "utf8");
  renameSync(linkTmp, linkPath);

  emit(win, {
    packId,
    status: "ready",
    currentVersion: remote.version,
    availableVersion: remote.version,
    progress: 100,
    message: "Redémarrer pour appliquer",
  });

  return next;
}

/** Restore previous pack version and delete the failed/newer directory. */
export function rollbackPack(packId: string): PackLocalState | null {
  const current = readLocalPack(packId);
  if (!current?.previousVersion || !current.previousPath) {
    return null;
  }
  if (!existsSync(current.previousPath)) {
    throw new Error(`Version précédente introuvable: ${current.previousPath}`);
  }

  const restored: PackLocalState = {
    id: packId,
    version: current.previousVersion,
    path: current.previousPath,
    entrypoint: current.entrypoint,
  };

  const linkPath = packCurrentLink(packId);
  const linkTmp = `${linkPath}.tmp`;
  writeFileSync(linkTmp, JSON.stringify(restored, null, 2), "utf8");
  renameSync(linkTmp, linkPath);

  if (existsSync(current.path) && current.path !== restored.path) {
    rmSync(current.path, { recursive: true, force: true });
  }

  packStates.set(packId, {
    packId,
    status: "up-to-date",
    currentVersion: restored.version,
    message: `Rollback → ${restored.version}`,
  });

  return restored;
}
