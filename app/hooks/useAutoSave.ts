"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { updateProject } from "@/app/lib/db";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave(
  projectId: string | null,
  data: Record<string, unknown>,
  changeCounter: number
) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef(data);
  const latestProjectIdRef = useRef(projectId);
  const isSavingRef = useRef(false);
  const hasQueuedSaveRef = useRef(false);
  const observedProjectIdRef = useRef<string | null>(projectId);
  const lastHandledChangeCounterRef = useRef(changeCounter);

  latestDataRef.current = data;
  latestProjectIdRef.current = projectId;

  const clearPendingTimeout = useCallback(() => {
    if (!timeoutRef.current) {
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const save = useCallback(async () => {
    const currentProjectId = latestProjectIdRef.current;
    if (!currentProjectId) {
      return;
    }

    if (isSavingRef.current) {
      hasQueuedSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setStatus("saving");

    try {
      await updateProject(currentProjectId, { data: latestDataRef.current });
      setStatus("saved");
    } catch (error) {
      console.error("[AutoSave] Failed to save project:", error);
      setStatus("error");
    } finally {
      isSavingRef.current = false;

      if (hasQueuedSaveRef.current) {
        hasQueuedSaveRef.current = false;
        void save();
      }
    }
  }, []);

  const saveNow = useCallback(async () => {
    clearPendingTimeout();
    await save();
  }, [clearPendingTimeout, save]);

  useEffect(() => {
    if (!projectId) {
      observedProjectIdRef.current = null;
      lastHandledChangeCounterRef.current = changeCounter;
      clearPendingTimeout();
      setStatus("idle");
      return;
    }

    if (observedProjectIdRef.current !== projectId) {
      observedProjectIdRef.current = projectId;
      lastHandledChangeCounterRef.current = changeCounter;
      clearPendingTimeout();
      setStatus("idle");
      return;
    }

    if (changeCounter === lastHandledChangeCounterRef.current) {
      return;
    }

    lastHandledChangeCounterRef.current = changeCounter;

    setStatus((currentStatus) =>
      currentStatus === "saving" ? currentStatus : "idle"
    );

    clearPendingTimeout();
    timeoutRef.current = setTimeout(() => {
      void save();
    }, 2000);

    return () => {
      clearPendingTimeout();
    };
  }, [changeCounter, clearPendingTimeout, projectId, save]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!latestProjectIdRef.current || !timeoutRef.current) {
        return;
      }

      clearPendingTimeout();
      void save();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [clearPendingTimeout, save]);

  return { status, saveNow };
}