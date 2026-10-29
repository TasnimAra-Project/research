"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";
import { Button } from "@/components/ui/Button";
import { SafetyNote } from "@/components/ui/SafetyBadge";
import { UnverifiedNote } from "@/components/eat/UnverifiedNote";
import { lookupBarcode } from "@/app/eat/barcode";
import { reviewFoods, type ReviewedFood } from "@/app/eat/review";

export function BarcodeScan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewedFood[] | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const checkCode = useCallback(async (raw: string) => {
    setStatus("Looking up that barcode.");
    setItems(null);
    const found = await lookupBarcode(raw);
    if ("error" in found) {
      setStatus(found.error);
      setTitle(null);
      return;
    }
    const reviewed = await reviewFoods(found.ingredients);
    setTitle(found.name);
    setItems(reviewed);
    setStatus(null);
  }, []);

  useEffect(() => {
    return () => stopRef.current?.();
  }, []);

  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 200 });
    reader.possibleFormats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ];
    void reader
      .decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } }, video, (result) => {
        if (cancelled || !result) return;
        const text = result.getText().trim();
        if (!text || /^https?:/i.test(text)) return;
        cancelled = true;
        stopRef.current?.();
        stopRef.current = null;
        setCameraOn(false);
        setCode(text);
        void checkCode(text);
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        stopRef.current = () => controls.stop();
      })
      .catch(() => {
        if (cancelled) return;
        setCameraOn(false);
        setStatus("The camera did not start. Type the barcode instead.");
      });
    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [cameraOn, checkCode]);

  return (
    <section className="mt-8 max-w-2xl rounded-[20px] bg-white p-4">
      <h2 className="font-display text-2xl font-bold">Scan a barcode</h2>
      <p className="mt-2 text-base">
        On a phone, use the back camera and hold the bars steady. You do not need an account. The ingredients are checked against the verified list.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => setCameraOn(true)} disabled={cameraOn}>
          Use camera
        </Button>
        {cameraOn ? (
          <Button variant="secondary" onClick={() => setCameraOn(false)}>
            Stop camera
          </Button>
        ) : null}
      </div>
      <video
        ref={videoRef}
        className={`mt-3 w-full rounded-2xl bg-blush ${cameraOn ? "block min-h-48" : "hidden"}`}
        muted
        playsInline
        autoPlay
      />
      {cameraOn ? <p className="mt-2 text-base">Looking for a barcode.</p> : null}
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void checkCode(code);
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="barcode" className="text-base font-semibold">
            Barcode
          </label>
          <input
            id="barcode"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-11 rounded-2xl border-2 border-rose bg-white px-4 text-base"
          />
        </div>
        <Button type="submit">Look up</Button>
      </form>
      {status ? (
        <p role="status" className="mt-3 text-base">
          {status}
        </p>
      ) : null}
      {title ? <h3 className="mt-4 font-display text-2xl font-bold">{title}</h3> : null}
      {items ? (
        <ul className="mt-3 space-y-3">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              <p className="font-semibold">{item.name}</p>
              <div className="mt-2">
                {item.verdict && item.verdict !== "unknown" ? (
                  <SafetyNote verdict={item.verdict} change={item.safeVersion} reason={item.reason} sourceName={item.sourceName} sourceUrl={item.sourceUrl} />
                ) : (
                  <UnverifiedNote guides={item.guides} />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
