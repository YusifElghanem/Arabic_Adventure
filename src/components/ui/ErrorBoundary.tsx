import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches rendering failures, most often a device without WebGL, and shows
 * a friendly message instead of a blank screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ArabicAdventure] Render error:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div dir="rtl" className="absolute inset-0 z-50 grid place-items-center bg-sky-100 p-6 text-center">
        <div className="max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <p className="text-5xl" aria-hidden>
            ☁️
          </p>
          <h2 className="mt-3 text-xl font-bold text-sky-700">عذرًا، حدثت مشكلة</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            قد لا يدعم هذا الجهاز الرسوم ثلاثية الأبعاد. جرّب تحديث المتصفح أو استخدام Chrome أو Safari الحديث.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-5 h-12 w-full rounded-2xl bg-sky-500 font-bold text-white shadow-lg transition hover:bg-sky-600 active:scale-[0.98]"
          >
            حاول مرة أخرى
          </button>
        </div>
      </div>
    );
  }
}
