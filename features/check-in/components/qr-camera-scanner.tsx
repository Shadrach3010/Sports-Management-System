"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera, CameraOff } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

export function QrCameraScanner({
  onScan,
  disabled,
}: {
  onScan: (token: string) => void;
  disabled: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!scanning) return;
    let disposed = false;
    let controls: IScannerControls | undefined;
    const video = videoRef.current;
    async function start() {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (disposed || !video) return;
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: "environment" } },
          video,
          (result) => {
            if (!result || disposed) return;
            const value = result.getText().trim();
            if (value.length < 20 || value.length > 200) {
              setError(
                "This QR code is not a CSMIS athlete pass. Try another pass.",
              );
              return;
            }
            controls?.stop();
            onScan(value);
            setError(null);
            setScanning(false);
          },
        );
        if (disposed) controls.stop();
      } catch {
        if (!disposed) {
          setError(
            "Camera could not start. Allow camera access on localhost or HTTPS, or enter the pass token manually.",
          );
          setScanning(false);
        }
      }
    }
    void start();
    return () => {
      disposed = true;
      controls?.stop();
      const stream = video?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((track) => track.stop());
    };
  }, [scanning, onScan]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled || !ready}
        onClick={() => {
          setError(null);
          setScanning((value) => !value);
        }}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:-translate-y-0.5 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {scanning ? (
          <CameraOff size={18} aria-hidden="true" />
        ) : (
          <Camera size={18} aria-hidden="true" />
        )}
        {scanning ? "Stop camera" : "Scan QR pass"}
      </button>
      {scanning ? (
        <div className="overflow-hidden rounded-2xl border border-orange-200 bg-slate-950 p-2">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Camera preview for QR scanning"
            className="aspect-video w-full rounded-xl object-cover"
          />
          <p className="px-2 py-1 text-xs text-white">
            Hold the athlete pass inside the camera frame.
          </p>
        </div>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
