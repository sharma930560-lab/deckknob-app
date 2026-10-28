/**
 * Format seconds into mm:ss
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function MusicTrackItem({
  track,
  isSelected = false,
  isPlaying = false,
  onSelect,
  onTogglePlay,
  isSaved = false,
  onToggleSave
}) {
  const isSyncCleared = Boolean(track.syncCleared && track.canPublish);
  const isPreviewOnly = Boolean(track.canPreview && !isSyncCleared);
  const isCommercialBlocked = track.provider === 'hoopr' || track.provider === 'epidemic' || track.rightsEvidence?.licenseStatus === 'commercial_credentials_required';

  const providerLabel = {
    deckknob_curated: 'DECKKNOB Curated',
    audius: 'Audius Catalog',
    hoopr: 'Hoopr (Commercial)',
    epidemic: 'Epidemic Sound',
    creator_upload: 'Original Sound'
  }[track.provider] || track.provider || 'Catalog';

  const rejectionReason = track.rightsEvidence?.rejectionReason || (
    isCommercialBlocked
      ? 'Commercial license credentials required.'
      : isPreviewOnly
      ? 'All Rights Reserved / Unverified sync license. Playable preview only.'
      : null
  );

  return (
    <div
      className={`group relative rounded-2xl border p-3 transition-all duration-200 ${
        isSelected
          ? 'border-[#DFE104] bg-[#DFE104]/10 shadow-[0_0_15px_rgba(223,225,4,0.15)]'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Track Artwork with Play Overlay */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/10">
          <img
            src={track.artwork || `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&auto=format&fit=crop&q=80`}
            alt={`${track.title} artwork`}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          {/* Quick Play/Pause on artwork */}
          {track.canPreview && (
            <button
              type="button"
              onClick={onTogglePlay}
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                isPlaying ? 'bg-black/60 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'
              }`}
              aria-label={isPlaying ? `Pause ${track.title}` : `Play preview of ${track.title}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DFE104] text-black shadow-md">
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Track Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-bold text-white tracking-wide" title={track.title}>
              {track.title}
            </h4>
            {track.rightsEvidence?.isDemoFixture && (
              <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-cyan-400">
                Demo
              </span>
            )}
          </div>
          <p className="truncate text-xs text-zinc-400" title={track.artist}>
            {track.artist}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-medium text-zinc-300">
              {providerLabel}
            </span>
            <span>{formatTime(track.duration)}</span>
            {track.bpm ? <span>• {track.bpm} BPM</span> : null}
            {track.genre && track.genre !== 'All' ? <span>• {track.genre}</span> : null}
          </div>
        </div>

        {/* Actions: Save & Select */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Bookmark / Save Audio */}
          {onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
                isSaved
                  ? 'border-[#DFE104]/50 bg-[#DFE104]/10 text-[#DFE104]'
                  : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white'
              }`}
              title={isSaved ? 'Remove from Saved Audio' : 'Save audio'}
              aria-label={isSaved ? 'Remove from Saved Audio' : 'Save audio'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}

          {/* Select Button with fail-closed state */}
          {isSyncCleared ? (
            <button
              type="button"
              onClick={() => onSelect(track)}
              className={`h-9 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                isSelected
                  ? 'bg-[#DFE104] text-black shadow-[0_0_10px_rgba(223,225,4,0.4)]'
                  : 'bg-white/[0.08] hover:bg-[#DFE104] hover:text-black text-white'
              }`}
              aria-label={`Select track ${track.title} for sync`}
            >
              {isSelected ? 'Selected' : 'Use'}
            </button>
          ) : (
            <div
              className="group/locked relative flex h-9 items-center gap-1 rounded-xl bg-zinc-800/80 px-2.5 text-[11px] font-bold text-zinc-400 border border-white/5 cursor-not-allowed"
              title={rejectionReason || 'Synchronization rights missing'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="hidden sm:inline">Preview Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Licensing Badge & Explanation Row */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/[0.04] pt-2 text-[10px]">
        {isSyncCleared ? (
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>✓ Verified Sync Rights ({track.rightsEvidence?.licenseType || 'CC BY 4.0'})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-400/90 font-medium truncate max-w-full">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="truncate">{rejectionReason}</span>
          </div>
        )}

        {track.rightsEvidence?.attributionRequired && track.rightsEvidence?.attributionText && (
          <span className="text-zinc-500 truncate max-w-[200px]" title={track.rightsEvidence.attributionText}>
            Attr: {track.rightsEvidence.attributionText}
          </span>
        )}
      </div>
    </div>
  );
}
