import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Format seconds into mm:ss
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function WaveformTrimmer({
  track,
  startTime = 0,
  duration = 15,
  onChange,
  isPlaying = false,
  onTogglePlay,
  currentTime = 0,
  audioDuration = 180
}) {
  const trackDuration = Math.max(10, Number(track?.duration || audioDuration || 180));
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasRealWaveform, setHasRealWaveform] = useState(false);
  const [waveformPeaks, setWaveformPeaks] = useState([]);

  // Supported duration presets
  const DURATION_PRESETS = [5, 10, 15, 20, 30];

  // Duration clamps
  const safeDuration = Math.min(Math.max(5, Number(duration) || 15), 30);
  const maxStart = Math.max(0, trackDuration - safeDuration);
  const safeStart = Math.min(Math.max(0, Number(startTime) || 0), maxStart);
  const safeEnd = Math.min(trackDuration, safeStart + safeDuration);

  // Attempt real Web Audio API peak analysis if audio is available and CORS permitted
  useEffect(() => {
    let isCancelled = false;
    const url = track?.audioUrl || track?.previewUrl;

    if (!url || !window.AudioContext && !window.webkitAudioContext) {
      setHasRealWaveform(false);
      return;
    }

    const analyzeAudio = async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('CORS or network error');
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        const rawData = audioBuffer.getChannelData(0);
        const samples = 64; // 64 bar resolution
        const blockSize = Math.floor(rawData.length / samples);
        const peaks = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          peaks.push(Math.min(1, (sum / blockSize) * 3));
        }
        setWaveformPeaks(peaks);
        setHasRealWaveform(true);
      } catch {
        // Fall back honestly to algorithmic rhythmic time bars without claiming false decoded waveform
        setHasRealWaveform(false);
      }
    };

    analyzeAudio();
    return () => {
      isCancelled = true;
    };
  }, [track?.id, track?.audioUrl, track?.previewUrl]);

  // Compute position percentage
  const startPercent = (safeStart / trackDuration) * 100;
  const clipWidthPercent = (safeDuration / trackDuration) * 100;
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / trackDuration) * 100));

  // Handle timeline scrubber interaction
  const handleSeek = useCallback(
    (clientX) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const targetTime = (clickX / rect.width) * trackDuration;
      // Center the clip window on click if possible, clamped safely
      const newStart = Math.min(Math.max(0, targetTime - safeDuration / 2), maxStart);
      onChange?.({ startTime: Math.round(newStart), duration: safeDuration });
    },
    [trackDuration, safeDuration, maxStart, onChange]
  );

  const onMouseDown = (e) => {
    setIsDragging(true);
    handleSeek(e.clientX);
  };

  const onTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      setIsDragging(true);
      handleSeek(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDragging) handleSeek(e.clientX);
    };
    const onTouchMove = (e) => {
      if (isDragging && e.touches && e.touches[0]) handleSeek(e.touches[0].clientX);
    };
    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handleSeek]);

  // Accessible Nudge controls (-1s / +1s)
  const nudge = (seconds) => {
    const nextStart = Math.min(Math.max(0, safeStart + seconds), maxStart);
    onChange?.({ startTime: nextStart, duration: safeDuration });
  };

  // Change duration preset
  const handleDurationChange = (newDur) => {
    const clampedDur = Math.min(30, Math.max(5, newDur));
    const nextMax = Math.max(0, trackDuration - clampedDur);
    const nextStart = Math.min(safeStart, nextMax);
    onChange?.({ startTime: nextStart, duration: clampedDur });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-black/40 p-3.5 backdrop-blur-md">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-zinc-400">
            {hasRealWaveform ? 'Waveform Trimmer' : 'Timeline Scrubber'}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {hasRealWaveform ? 'Decoded Audio' : 'Time-Indexed'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[#DFE104] font-bold">{formatTime(safeStart)}</span>
          <span className="text-zinc-600">—</span>
          <span className="text-[#DFE104] font-bold">{formatTime(safeEnd)}</span>
          <span className="text-zinc-500">({safeDuration}s clip)</span>
        </div>
      </div>

      {/* Interactive Waveform / Timeline Track */}
      <div
        ref={timelineRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="group relative h-16 w-full cursor-pointer select-none overflow-hidden rounded-xl bg-white/[0.04] p-1.5 transition-colors hover:bg-white/[0.06]"
        role="slider"
        aria-label="Audio clip range scrubber"
        aria-valuemin={0}
        aria-valuemax={maxStart}
        aria-valuenow={safeStart}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') nudge(-1);
          if (e.key === 'ArrowRight') nudge(1);
        }}
      >
        {/* Background Visual Bars */}
        <div className="flex h-full w-full items-center justify-between gap-[2px]">
          {Array.from({ length: 64 }).map((_, idx) => {
            const barHeight = hasRealWaveform
              ? Math.max(12, Math.round((waveformPeaks[idx] || 0.2) * 100))
              : Math.max(15, Math.round(((Math.sin(idx * 0.4) + 1.2) / 2.2) * 85));
            const isInsideSelection =
              (idx / 64) * 100 >= startPercent && (idx / 64) * 100 <= startPercent + clipWidthPercent;

            return (
              <span
                key={idx}
                className={`w-full rounded-full transition-all duration-150 ${
                  isInsideSelection
                    ? 'bg-[#DFE104] opacity-90'
                    : 'bg-white/20 opacity-40 group-hover:opacity-60'
                }`}
                style={{ height: `${barHeight}%` }}
              />
            );
          })}
        </div>

        {/* Selected Window Highlight */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 rounded-lg border-2 border-[#DFE104] bg-[#DFE104]/10 shadow-[0_0_12px_rgba(223,225,4,0.2)]"
          style={{
            left: `${startPercent}%`,
            width: `${clipWidthPercent}%`
          }}
        >
          {/* Edge drag indicators */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-1 rounded-full bg-[#DFE104]" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-5 w-1 rounded-full bg-[#DFE104]" />
        </div>

        {/* Live Playhead Indicator */}
        {isPlaying && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_#fff]"
            style={{ left: `${playheadPercent}%` }}
          />
        )}
      </div>

      {/* Time markers bar */}
      <div className="flex justify-between px-1 text-[10px] font-mono text-zinc-500">
        <span>0:00</span>
        <span>{formatTime(trackDuration / 2)}</span>
        <span>{formatTime(trackDuration)}</span>
      </div>

      {/* Control Buttons & Duration Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
        {/* Play / Pause Preview Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-9 items-center gap-2 rounded-xl bg-[#DFE104] px-3.5 text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105 active:scale-95"
            aria-label={isPlaying ? 'Pause clip preview' : 'Play clip preview'}
          >
            {isPlaying ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>Pause</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Preview</span>
              </>
            )}
          </button>

          {/* Accessible Step Nudge Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={safeStart <= 0}
              className="h-8 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 text-[11px] font-bold text-zinc-300 transition-colors"
              title="Nudge 1s earlier"
              aria-label="Nudge 1 second earlier"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={safeStart >= maxStart}
              className="h-8 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 text-[11px] font-bold text-zinc-300 transition-colors"
              title="Nudge 1s later"
              aria-label="Nudge 1 second later"
            >
              +1s
            </button>
          </div>
        </div>

        {/* Clip Duration Presets (5s to 30s) */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase text-zinc-500 mr-1 hidden sm:inline">Clip:</span>
          {DURATION_PRESETS.map((dur) => (
            <button
              key={dur}
              type="button"
              onClick={() => handleDurationChange(dur)}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all ${
                safeDuration === dur
                  ? 'bg-[#DFE104] text-black shadow-[0_0_8px_rgba(223,225,4,0.3)]'
                  : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'
              }`}
              aria-label={`Set clip duration to ${dur} seconds`}
            >
              {dur}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
