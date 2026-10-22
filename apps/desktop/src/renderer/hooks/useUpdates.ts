import { useEffect, useState } from "react";
import type { AppInfo, PackUpdateState, ShellUpdateState } from "@teka/shared";

const idleShell: ShellUpdateState = {
  status: "idle",
  currentVersion: "…",
  message: "Initialisation…",
};

export function useUpdates() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [shell, setShell] = useState<ShellUpdateState>(idleShell);
  const [packs, setPacks] = useState<PackUpdateState[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.teka.getAppInfo().then(setInfo);
    void window.teka.getUpdateState().then(setShell);
    void window.teka.getPacksState().then(setPacks);

    const offShell = window.teka.onShellUpdate(setShell);
    const offPack = window.teka.onPackUpdate((p) => {
      setPacks((prev) => {
        const others = prev.filter((x) => x.packId !== p.packId);
        return [...others, p];
      });
    });
    return () => {
      offShell();
      offPack();
    };
  }, []);

  async function checkNow() {
    setBusy(true);
    try {
      const res = await window.teka.checkUpdates();
      setShell(res.shell);
      setPacks(res.packs);
    } finally {
      setBusy(false);
    }
  }

  async function installShell() {
    await window.teka.installShellUpdate();
  }

  async function rollback(packId: string) {
    setBusy(true);
    try {
      await window.teka.rollbackPack(packId);
      const next = await window.teka.getPacksState();
      setPacks(next);
    } finally {
      setBusy(false);
    }
  }

  return { info, shell, packs, busy, checkNow, installShell, rollback };
}
