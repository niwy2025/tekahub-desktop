import { useEffect, useState } from "react";
import type { PackUpdateState, ShellUpdateState } from "@teka/shared";

const idleShell: ShellUpdateState = {
  status: "idle",
  currentVersion: "…",
  message: "Initialisation…",
};

export function useUpdates(enabled: boolean) {
  const [shell, setShell] = useState<ShellUpdateState>(idleShell);
  const [packs, setPacks] = useState<PackUpdateState[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !window.teka) return;

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
  }, [enabled]);

  async function checkNow() {
    if (!window.teka) return;
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
    await window.teka?.installShellUpdate();
  }

  async function rollback(packId: string) {
    if (!window.teka) return;
    setBusy(true);
    try {
      await window.teka.rollbackPack(packId);
      setPacks(await window.teka.getPacksState());
    } finally {
      setBusy(false);
    }
  }

  return { shell, packs, busy, checkNow, installShell, rollback };
}
