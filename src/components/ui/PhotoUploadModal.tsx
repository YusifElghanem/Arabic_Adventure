import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import {
  FaceCropError,
  MAX_REGION_SHARE,
  MIN_REGION_SHARE,
  clampRegion,
  detectFace,
  loadPhoto,
  renderFaceCrop,
  type DetectionMethod,
  type FaceRegion,
  type LoadedPhoto,
} from '@/utils/faceCropper';
import { CameraIcon, CheckIcon, CloseIcon, GalleryIcon, TrashIcon, ZoomInIcon, ZoomOutIcon } from './icons';

/**
 * Parent-facing dialog: pick or take a photo, check and adjust the
 * auto-detected face oval, then save it as the player's face texture.
 * Photos never leave the device. They are cropped in a canvas and kept in
 * localStorage.
 */

type Phase =
  | { kind: 'pick' }
  | { kind: 'processing' }
  | { kind: 'adjust'; photo: LoadedPhoto; region: FaceRegion; method: DetectionMethod }
  | { kind: 'error'; message: string };

const ERROR_MESSAGES: Record<FaceCropError['code'], string> = {
  'not-an-image': 'هذا الملف ليس صورة. اختر صورة من فضلك.',
  'too-large': 'الصورة كبيرة جدًا. اختر صورة أصغر من ٢٠ ميجابايت.',
  'decode-failed': 'تعذّر فتح الصورة. جرّب صورة أخرى.',
  'encode-failed': 'تعذّر تجهيز الصورة. جرّب مرة أخرى.',
};

const VIEW_SIZE = 280;
/** The oval's height inside the adjust view, as a share of the view. */
const VIEW_OVAL_SHARE = 0.4;
const PREVIEW_SIZE = 160;

export default function PhotoUploadModal() {
  const isOpen = useGameStore((s) => s.isPhotoModalOpen);
  const close = useGameStore((s) => s.closePhotoModal);
  const currentFace = useGameStore((s) => s.faceTextureUrl);
  const setFaceTextureUrl = useGameStore((s) => s.setFaceTextureUrl);
  const clearFaceTexture = useGameStore((s) => s.clearFaceTexture);

  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const [isDragOver, setIsDragOver] = useState(false);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Each file gets a token so a slow decode cannot overwrite a newer pick.
  const requestToken = useRef(0);

  // Reset each time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setPhase({ kind: 'pick' });
      requestAnimationFrame(() => dialogRef.current?.focus());
    }
  }, [isOpen]);

  // Escape closes; keep focus inside the dialog while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]):not([type="file"]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const token = ++requestToken.current;
    setPhase({ kind: 'processing' });
    try {
      const photo = await loadPhoto(file);
      const { region, method } = await detectFace(photo);
      if (token === requestToken.current) setPhase({ kind: 'adjust', photo, region, method });
    } catch (error) {
      if (token !== requestToken.current) return;
      const message =
        error instanceof FaceCropError ? ERROR_MESSAGES[error.code] : ERROR_MESSAGES['decode-failed'];
      setPhase({ kind: 'error', message });
    }
  }, []);

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
    // Allow re-selecting the same file later.
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const save = () => {
    if (phase.kind !== 'adjust') return;
    try {
      setFaceTextureUrl(renderFaceCrop(phase.photo, phase.region));
      close();
    } catch {
      setPhase({ kind: 'error', message: ERROR_MESSAGES['encode-failed'] });
    }
  };

  const remove = () => {
    clearFaceTexture();
    close();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/60 p-4 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        dir="rtl"
        className="relative flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[2rem] bg-white p-6 text-slate-800 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="إغلاق"
          className="absolute top-4 left-4 grid size-11 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
        >
          <CloseIcon size={22} />
        </button>

        <header className="pe-2 ps-12">
          <h2 id={titleId} className="text-2xl font-bold text-sky-700">
            صورة طفلك في اللعبة
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            اختر صورة واضحة لوجه طفلك. الصورة تبقى على هذا الجهاز فقط ولا تُرفع إلى أي مكان.
          </p>
        </header>

        {phase.kind === 'adjust' ? (
          <AdjustStep
            photo={phase.photo}
            region={phase.region}
            method={phase.method}
            onRegionChange={(region) => setPhase({ ...phase, region })}
          />
        ) : (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl border-4 border-dashed p-6 text-center transition ${
              isDragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            {phase.kind === 'processing' ? (
              <>
                <div className="size-14 animate-spin rounded-full border-[6px] border-sky-200 border-t-sky-500" />
                <p className="font-semibold text-slate-600">نبحث عن الوجه…</p>
              </>
            ) : (
              <>
                {currentFace ? (
                  <img src={currentFace} alt="الصورة الحالية" className="size-28 rounded-full bg-amber-100 object-contain shadow-inner" />
                ) : (
                  <div className="grid size-28 place-items-center rounded-full bg-sky-100 text-sky-500">
                    <CameraIcon size={52} />
                  </div>
                )}
                {phase.kind === 'error' && (
                  <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                    {phase.message}
                  </p>
                )}
                <p className="text-sm text-slate-500">اسحب صورة إلى هنا أو استخدم الأزرار</p>
              </>
            )}
          </div>
        )}

        <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
        <input ref={cameraInput} type="file" accept="image/*" capture="user" className="hidden" onChange={onInputChange} />

        <footer className="flex flex-col gap-3">
          {phase.kind === 'adjust' ? (
            <>
              <button
                type="button"
                onClick={save}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-lg font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.98]"
              >
                <CheckIcon size={24} />
                استخدم هذه الصورة
              </button>
              <button
                type="button"
                onClick={() => galleryInput.current?.click()}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
              >
                <GalleryIcon size={20} />
                اختر صورة أخرى
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={phase.kind === 'processing'}
                  onClick={() => cameraInput.current?.click()}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50"
                >
                  <CameraIcon size={22} />
                  التقط صورة
                </button>
                <button
                  type="button"
                  disabled={phase.kind === 'processing'}
                  onClick={() => galleryInput.current?.click()}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet-500 font-bold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-600 active:scale-[0.98] disabled:opacity-50"
                >
                  <GalleryIcon size={22} />
                  من المعرض
                </button>
              </div>
              {currentFace && phase.kind !== 'processing' && (
                <button
                  type="button"
                  onClick={remove}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98]"
                >
                  <TrashIcon size={20} />
                  إزالة الصورة الحالية
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Adjust step                                 */
/* -------------------------------------------------------------------------- */

interface AdjustStepProps {
  photo: LoadedPhoto;
  region: FaceRegion;
  method: DetectionMethod;
  onRegionChange: (region: FaceRegion) => void;
}

function AdjustStep({ photo, region, method, onRegionChange }: AdjustStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const short = Math.min(photo.width, photo.height);

  // Zoom slider: 0 = widest crop, 1 = tightest.
  const zoom = useMemo(() => {
    const share = region.ry / short;
    return 1 - (share - MIN_REGION_SHARE) / (MAX_REGION_SHARE - MIN_REGION_SHARE);
  }, [region.ry, short]);

  const setZoom = (value: number) => {
    const share = MIN_REGION_SHARE + (1 - value) * (MAX_REGION_SHARE - MIN_REGION_SHARE);
    const ry = share * short;
    onRegionChange(clampRegion({ ...region, ry, rx: ry / (region.ry / region.rx) }, photo.width, photo.height));
  };

  // Draw the photo moving under a fixed oval window.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEW_SIZE * dpr;
    canvas.height = VIEW_SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = requestAnimationFrame(() => {
      const ovalRy = VIEW_SIZE * VIEW_OVAL_SHARE;
      const ovalRx = ovalRy * (region.rx / region.ry);
      const scale = ovalRy / region.ry;
      const c = VIEW_SIZE / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);
      ctx.imageSmoothingQuality = 'high';
      ctx.save();
      ctx.translate(c - region.cx * scale, c - region.cy * scale);
      ctx.scale(scale, scale);
      ctx.drawImage(photo.canvas, 0, 0);
      ctx.restore();

      // Dim everything outside the oval.
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, VIEW_SIZE, VIEW_SIZE);
      ctx.ellipse(c, c, ovalRx, ovalRy, 0, 0, Math.PI * 2);
      ctx.fill('evenodd');

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.ellipse(c, c, ovalRx, ovalRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    return () => cancelAnimationFrame(frame);
  }, [photo, region]);

  // Live preview of the final cut-out, throttled to one render per frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setPreview(renderFaceCrop(photo, region, { size: PREVIEW_SIZE }));
      } catch {
        setPreview(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [photo, region]);

  const viewScale = (VIEW_SIZE * VIEW_OVAL_SHARE) / region.ry;

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const cssToView = VIEW_SIZE / rect.width;
    const dx = (event.clientX - d.x) * cssToView;
    const dy = (event.clientY - d.y) * cssToView;
    drag.current = { ...d, x: event.clientX, y: event.clientY };
    // Dragging the photo right moves the crop window left over the photo.
    onRegionChange(
      clampRegion(
        { ...region, cx: region.cx - dx / viewScale, cy: region.cy - dy / viewScale },
        photo.width,
        photo.height,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-center text-sm text-slate-500">
        {method === 'fallback'
          ? 'لم نجد الوجه تلقائيًا. حرّك الصورة لتضع الوجه داخل الشكل.'
          : 'وجدنا الوجه! حرّك الصورة أو كبّرها إن احتجت.'}
      </p>
      <div className="flex w-full items-center justify-center gap-4">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="اسحب لتحريك الصورة"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={(event) => setZoom(Math.min(1, Math.max(0, zoom - Math.sign(event.deltaY) * 0.04)))}
          className="aspect-square w-[min(100%,280px)] cursor-grab touch-none rounded-3xl shadow-inner active:cursor-grabbing"
        />
      </div>

      <div className="flex w-full items-center gap-3" dir="ltr">
        <ZoomOutIcon size={22} className="shrink-0 text-slate-400" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label="تكبير"
          className="h-2 w-full cursor-pointer accent-sky-500"
        />
        <ZoomInIcon size={22} className="shrink-0 text-slate-400" />
      </div>

      {preview && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-2">
          <img src={preview} alt="معاينة الوجه" className="size-16 rounded-full bg-amber-200 object-contain" />
          <span className="text-sm font-semibold text-amber-800">هكذا سيظهر الوجه في اللعبة</span>
        </div>
      )}
    </div>
  );
}
