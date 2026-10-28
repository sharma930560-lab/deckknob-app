# Implementation Plan: Instagram-Style Music for Stories and Image Posts

## 1. Objective
Implement a modular, provider-independent Instagram-style music system for DECKKNOB Stories and Image Posts. The feature allows creators to search, preview, and select authorized music segments (start time, duration, waveform/timeline scrubber), adds interactive music stickers/labels, saves verified license metadata, and delivers synchronized audio playback with single-audio coordination and autoplay handling across Stories and Posts.

---

## 2. Repository Inspection Findings
- **Story Creation (`frontend/src/pages/Upload.jsx`)**:
  - Contains basic music state hooks (`selectedMusic`, `musicLibrary`, `musicTrimStart`, `musicTrimEnd`), but only connects to a basic static array with no dedicated Instagram-style picker modal, waveform scrubber, trending/latest tabs, genre filtering, or provider abstraction.
  - Currently, image post creation (`mode === 'post'`) does not have music attachment enabled.
- **Story Viewer (`frontend/src/components/stories/StoryViewer.jsx`)**:
  - References `activeStory.music` and displays a small indicator pill, but the `<audio>` element was omitted in the JSX return, preventing actual playback.
- **Image Post Feed (`frontend/src/components/feed/PostCard.jsx`)**:
  - Displays images and videos, but has no music badge or audio playback controls for image posts with attached music.
- **Music Service (`frontend/src/services/musicService.js`)**:
  - Currently contains static sound helix mock tracks and an upload helper, but lacks a provider-independent interface, Audius adapter, licensing verification engine, trending/latest cache, or commercial stub adapters.
- **Firestore Schema**:
  - `stories` already supports `music: options.music || null`.
  - `posts` needs `music: options.music || null` added to `postService.createPost` and returned in `getPosts` and `getUserPosts`. No Firestore security rule changes needed.

---

## 3. Architecture & Design

### A. Music Provider Interface & Adapters (`frontend/src/services/music/`)
1. **Core Service Interface (`MusicServiceInterface`)**:
   - `searchTracks(query, filters)`
   - `getTrendingTracks()`
   - `getLatestTracks()`
   - `getTrackDetails(trackId)`
   - `getPlayablePreview(trackId)`
   - `getAuthorizedClip(trackId, start, duration)`
   - `verifyTrackRights(track)` -> Strictly verifies sync licensing suitability.

2. **Audius Adapter (`AudiusMusicAdapter`)**:
   - Dynamic host resolution via Audius discovery API (`https://api.audius.co`).
   - Queries `/v1/tracks/trending`, `/v1/tracks/search`.
   - **Licensing Gate**: Filters tracks strictly for sync-suitable Creative Commons licenses (e.g. `cc-by`, `cc-by-sa`) or creator-marked open use; rejects all-rights-reserved tracks with clear licensing notices.

3. **Curated Royalty-Free Adapter (`CuratedMusicAdapter`)**:
   - Curated catalog of electronic, techno, house, ambient, and synthwave tracks with verified royalty-free sync licenses.

4. **Commercial Stubs (`CommercialAdapters`)**:
   - Hoopr & Epidemic Sound adapters ready for enterprise API keys, returning structured stub metadata indicating credentials are required before activation.

### B. Instagram-Style Music Picker Modal (`frontend/src/components/music/MusicPickerModal.jsx`)
- Tabbable discovery interface: **Trending**, **Latest**, **Genres** (Techno, House, Melodic, Drum & Bass, Synthwave, Ambient), and **Search**.
- Track card: artwork, track title, artist, genre badge, verified license badge, duration, and instant inline play/pause preview.
- **Waveform / Segment Scrubber**:
  - Interactive timeline showing track length.
  - Start offset selector slider and duration pill selector (5s, 10s, 15s, 30s).
  - Synchronized audio preview looping the chosen segment.
- "Add to Story / Post" confirmation button that emits the normalized music attachment payload.

### C. Story Integration (`Upload.jsx` & `StoryViewer.jsx`)
- "🎵 Add Music" button in Story creation workspace.
- Interactive Music Sticker on canvas showing title, artist, and attribution.
- In `StoryViewer.jsx`:
  - Dedicated `<audio>` element with `src={activeStory.music.audioUrl}`.
  - Auto-seeks to `activeStory.music.startTime || 0`.
  - Loops or plays for `activeStory.music.duration`.
  - Synchronized audio visualizer wave animation.
  - Volume/mute toggle and tap-to-play recovery for browser autoplay policies.
  - Automatically pauses audio when Story changes, closes, or document becomes hidden.

### D. Image Post Integration (`Upload.jsx` & `PostCard.jsx`)
- "🎵 Add Music" control in Image Post creation mode.
- In `PostCard.jsx`:
  - Renders Instagram-style music badge: `🎵 Title • Artist` with animated equalizer waves when playing.
  - Play / Pause button on post image.
  - Global audio coordinator ensuring only one post or story audio plays at a time.
  - Mute/unmute state management and stop on scroll-out.

### E. Firestore Schema & Licensing Metadata
```typescript
interface AttachedMusic {
  provider: 'audius' | 'deckknob_curated' | 'creator_upload';
  trackId: string;
  title: string;
  artist: string;
  artwork: string;
  audioUrl: string;
  startTime: number;
  duration: number;
  genre?: string;
  bpm?: number;
  licenseType: string;
  licenseStatus: 'verified' | 'creator_owned';
  attribution: string;
  territory: 'worldwide';
}
```

---

## 4. Detailed Implementation Tasks

<task id="task-1-music-provider-system">
<action>
Create `frontend/src/services/music/musicProvider.js`:
- Define provider registry with `searchTracks`, `getTrendingTracks`, `getLatestTracks`, `getTrackDetails`, `getAuthorizedClip`, and `verifyTrackRights`.
- Implement `AudiusMusicAdapter` with API host caching, search, trending, stream URL resolution, and licensing inspection (filtering for sync-authorized tracks).
- Implement `CuratedMusicAdapter` with pre-licensed electronic tracks.
- Implement Hoopr and Epidemic Sound stub adapters.
- Implement client-side cache (`localStorage`) with 1-hour TTL for trending and latest tracks.
- Export unified `musicService`.
</action>
<verify>
Unit test provider operations, licensing gate rejection of non-CC tracks, segment boundary math, and cache TTL in `test-feature-suite.js`.
</verify>
<done>
Provider system operates independently with live Audius integration, curated library, license validation, and zero paid API calls.
</done>
</task>

<task id="task-2-music-picker-component">
<action>
Create `frontend/src/components/music/MusicPickerModal.jsx`:
- Full-screen / modal dialog matching DECKKNOB dark theme (#DFE104 accents).
- Search input with debounce.
- Tabs for Trending, Latest, and Genres pills.
- Track list showing artwork, title, artist, genre, license tag, and play/pause preview.
- Segment Editor: waveform/timeline slider to pick start time (0 to track duration - clip duration) and duration pills (5s, 10s, 15s, 30s).
- Segment preview playback that loops the selected slice.
- Selection handler returning verified `AttachedMusic` payload.
</action>
<verify>
Verify rendering, tab switching, segment time clamping, and preview audio controls in browser.
</verify>
<done>
Music picker modal opens cleanly, previews tracks, and returns sanitized segment metadata.
</done>
</task>

<task id="task-3-story-music-creation-and-playback">
<action>
1. Update `frontend/src/pages/Upload.jsx`:
   - Connect "🎵 Add Music" button in Story mode to open `MusicPickerModal`.
   - Add/update interactive music sticker on the story canvas displaying track title and artist.
   - Attach selected music payload to `storyService.createStory`.
2. Update `frontend/src/components/stories/StoryViewer.jsx`:
   - Render real `<audio>` element with audio URL, volume, and playback synchronization.
   - Respect `activeStory.music.startTime` and `duration`.
   - Handle browser autoplay restriction: if `play()` fails, display a "Tap to Unmute" overlay.
   - Cleanly stop and pause audio on story transition, close, or tab visibility change.
</action>
<verify>
Verify story creation with music sticker, audio element playback, timeline seek, and auto-pause on close.
</verify>
<done>
Stories play synchronized authorized music segments and display attribution stickers.
</done>
</task>

<task id="task-4-image-post-music-creation-and-feed">
<action>
1. Update `frontend/src/pages/Upload.jsx`:
   - Enable "🎵 Add Music" for image post mode.
   - Display selected track chip with option to change or remove.
   - Pass music metadata to `postService.createPost`.
2. Update `frontend/src/services/postService.js`:
   - Include `music: options.music || null` in post document creation and query results (`getPosts`, `getUserPosts`).
3. Update `frontend/src/components/feed/PostCard.jsx`:
   - Add music banner / badge on post media showing track and artist.
   - Add Play / Pause audio control on the badge.
   - Connect to a global post audio manager so only one post audio plays at a time.
   - Auto-pause when scrolled out of view.
</action>
<verify>
Verify image post creation with music, feed badge display, audio playback toggle, and mutual exclusivity.
</verify>
<done>
Image posts render music labels and play isolated audio clips on demand.
</done>
</task>

<task id="task-5-automated-tests-and-build">
<action>
Add Feature 16 test suite to `frontend/test-feature-suite.js`:
- Provider interface operations (`searchTracks`, `getTrendingTracks`, `getLatestTracks`, `getAuthorizedClip`).
- Licensing rights inspection (accepting CC-BY, rejecting all-rights-reserved).
- Segment start and duration clamping (5s to 30s limits).
- Story music sticker and metadata validation.
- Image post music association and schema compatibility.
- Backward compatibility for stories and posts without music.
- Single audio player coordination.
Run `node test-feature-suite.js` and `npm run build`.
</action>
<verify>
Execute `node test-feature-suite.js` and verify all tests pass. Execute `npm run build` and verify clean build.
</verify>
<done>
100% test pass rate and clean build without regressions.
</done>
</task>

---

## 5. Strict Safety Compliance
- Local implementation only: NO deployments to preview or production.
- Zero Firestore/Storage rules modifications: Firestore security rules already permit standard document payload fields.
- Zero billing upgrades: Spark plan preserved; client-side caching used for catalog queries.
- Zero disruption to existing posts, stories, comments, or user profiles.
