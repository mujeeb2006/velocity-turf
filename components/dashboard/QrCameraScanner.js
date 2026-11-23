"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, Icon, font, mono } from "@/components/dashboard/kit";
import { COLORS as V } from "@/lib/design-tokens";

/**
 * QR Camera Scanner component using html5-qrcode.
 * Supports:
 * - Device camera selection (environment/back, user/front)
 * - Flashlight / torch toggle where supported
 * - Camera permission error feedback
 * - Start / Stop scanner controls
 * - Graceful cleanup on unmount
 */
export function QrCameraScanner({ onScan, onError, isScanning, onStopScan, onStartScan }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [loadingCamera, setLoadingCamera] = useState(false);
  const containerIdRef = useRef(`qr-reader-${Math.random().toString(36).slice(2, 9)}`);

  // Detect available cameras
  useEffect(() => {
    let mounted = true;
    async function loadCameras() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const devices = await Html5Qrcode.getCameras();
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera on mobile
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      } catch (err) {
        console.warn("Could not list cameras:", err);
      }
    }
    loadCameras();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle start/stop camera
  useEffect(() => {
    let active = true;

    async function startScanner() {
      if (!isScanning) return;
      setCameraError("");
      setLoadingCamera(true);

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!active) return;

        // Clean up any existing instance
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
          } catch (_) {}
          html5QrCodeRef.current = null;
        }

        const html5QrCode = new Html5Qrcode(containerIdRef.current);
        html5QrCodeRef.current = html5QrCode;

        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: "environment" };

        const config = {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(180, Math.floor(minEdge * 0.72));
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          cameraConfig,
          config,
          (decodedText) => {
            if (active && decodedText) {
              // Pause scanning or notify parent
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // Frame parse error - expected when no QR in frame, don't spam
          }
        );

        if (active) {
          setLoadingCamera(false);
          // Check torch capability
          try {
            const capabilities = html5QrCode.getRunningTrackCameraCapabilities?.();
            setHasTorch(Boolean(capabilities?.torchFeature?.()?.isSupported?.()));
          } catch (_) {
            setHasTorch(false);
          }
        }
      } catch (err) {
        if (!active) return;
        setLoadingCamera(false);
        console.error("Camera scanner error:", err);
        let msg = "Could not access camera.";
        const errName = err?.name || String(err);
        if (errName.includes("NotAllowedError") || errName.includes("PermissionDenied")) {
          msg = "Camera permission was denied. Please allow camera access in your browser settings to scan QR tickets.";
        } else if (errName.includes("NotFoundError") || errName.includes("DevicesNotFoundError")) {
          msg = "No camera found on this device. Please use manual booking ID lookup below.";
        } else if (errName.includes("NotReadableError") || errName.includes("TrackStartError")) {
          msg = "Camera is currently in use by another application or tab.";
        }
        setCameraError(msg);
        if (onError) onError(msg);
      }
    }

    if (isScanning) {
      startScanner();
    } else {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current = null;
          setTorchOn(false);
          setHasTorch(false);
        });
      }
    }

    return () => {
      active = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrCodeRef.current = null;
        });
      }
    };
  }, [isScanning, selectedCameraId]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Failed to toggle torch:", e);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      {/* Scanner container */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0E1526",
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          minHeight: isScanning ? 320 : 180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${V.line}`,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div
          id={containerIdRef.current}
          style={{
            width: "100%",
            display: isScanning && !cameraError ? "block" : "none",
          }}
        />

        {loadingCamera && isScanning && (
          <div style={{ padding: 24, textAlign: "center", color: "#FFFFFF" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Starting Camera…</div>
            <div style={{ fontSize: 12, color: "#8B9BB4" }}>Requesting camera permission</div>
          </div>
        )}

        {cameraError && isScanning && (
          <div style={{ padding: 24, textAlign: "center", maxWidth: 360 }}>
            <div style={{ color: "#FF5252", fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Camera Error</div>
            <div style={{ color: "#E0E6ED", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{cameraError}</div>
            <Btn size="sm" variant="secondary" onClick={onStartScan}>Retry Camera</Btn>
          </div>
        )}

        {!isScanning && (
          <div style={{ padding: "36px 20px", textAlign: "center" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.15)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22C55E",
                marginBottom: 14,
              }}
            >
              <Icon name="camera" size={28} />
            </div>
            <div style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Camera is Idle</div>
            <div style={{ color: "#94A3B8", fontSize: 13, maxWidth: 300, marginBottom: 18, lineHeight: 1.4 }}>
              Tap below to activate device camera and scan players' QR tickets.
            </div>
            <Btn variant="primary" icon="camera" onClick={onStartScan}>
              Open Camera Scanner
            </Btn>
          </div>
        )}
      </div>

      {/* Camera Controls bar (when active) */}
      {isScanning && !cameraError && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: 420,
          }}
        >
          <Btn variant="danger" size="sm" onClick={onStopScan}>
            Close Camera
          </Btn>

          {hasTorch && (
            <Btn
              size="sm"
              variant={torchOn ? "primary" : "secondary"}
              onClick={toggleTorch}
              icon="zap"
            >
              {torchOn ? "Flashlight On" : "Flashlight Off"}
            </Btn>
          )}

          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${V.line}`,
                background: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                color: V.chalk,
                outline: "none",
                fontFamily: font,
              }}
              aria-label="Switch camera"
            >
              {cameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
