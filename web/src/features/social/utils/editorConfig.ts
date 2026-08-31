export const BASIC_FILTERS = [
  { name: 'Original', filter: '' },
  { name: 'Bright', filter: 'brightness(1.15) contrast(1.05)' },
  { name: 'Warm', filter: 'sepia(0.2) saturate(1.15) hue-rotate(-5deg)' },
  { name: 'Cool', filter: 'saturate(1.1) hue-rotate(10deg) brightness(0.95)' },
  { name: 'HDR', filter: 'contrast(1.3) saturate(1.3) brightness(1.05)' },
  { name: 'Vivid', filter: 'saturate(1.6) contrast(1.1)' },
  { name: 'Vintage', filter: 'sepia(0.45) contrast(0.9) saturate(0.85) brightness(1.02)' },
  { name: 'Mono', filter: 'grayscale(1)' },
  { name: 'Noir', filter: 'grayscale(1) contrast(1.4) brightness(0.9)' },
  { name: 'Fade', filter: 'opacity(0.9) brightness(1.05) contrast(0.9) saturate(0.9)' },
  { name: 'Dream', filter: 'blur(0.5px) brightness(1.08) saturate(1.2)' },
  { name: 'Soft Glow', filter: 'brightness(1.1) saturate(1.15) contrast(0.95)' }
];

export const NIGHTLIFE_FILTERS = [
  { name: 'Neon Blue', filter: 'hue-rotate(190deg) saturate(1.8) contrast(1.2)' },
  { name: 'Cyberpunk', filter: 'hue-rotate(280deg) saturate(2) contrast(1.35) brightness(1.05)' },
  { name: 'Club Lights', filter: 'hue-rotate(120deg) saturate(1.7) contrast(1.25)' },
  { name: 'Laser Green', filter: 'hue-rotate(85deg) saturate(1.9) contrast(1.3)' },
  { name: 'Festival Lights', filter: 'hue-rotate(320deg) saturate(1.8) brightness(1.1) contrast(1.1)' },
  { name: 'Purple Haze', filter: 'hue-rotate(250deg) saturate(1.5) contrast(1.15)' },
  { name: 'Smoke Machine', filter: 'blur(1px) contrast(0.85) brightness(1.1)' },
  { name: 'Disco', filter: 'hue-rotate(45deg) saturate(2) contrast(1.25) brightness(1.1)' },
  { name: 'Night Mode', filter: 'brightness(0.7) contrast(1.3) saturate(0.8)' },
  { name: 'Underground Club', filter: 'brightness(0.65) contrast(1.4) saturate(1.5) sepia(0.1)' },
  { name: 'Glow', filter: 'contrast(1.1) saturate(1.4) brightness(1.15)' },
  { name: 'EDM Stage', filter: 'hue-rotate(160deg) saturate(2) brightness(1.05) contrast(1.3)' },
  { name: 'UV Lights', filter: 'hue-rotate(230deg) saturate(2.2) contrast(1.4) brightness(0.9)' },
  { name: 'Sunset Party', filter: 'sepia(0.35) saturate(1.6) hue-rotate(-20deg) brightness(1.05)' },
  { name: 'After Party', filter: 'sepia(0.15) saturate(1.2) contrast(1.05) brightness(0.9)' }
];

export const ADJUSTMENTS_LIST = [
  { id: 'brightness', name: 'Brightness', min: 50, max: 150, default: 100, unit: '%' },
  { id: 'contrast', name: 'Contrast', min: 50, max: 150, default: 100, unit: '%' },
  { id: 'exposure', name: 'Exposure', min: 50, max: 150, default: 100, unit: '%' },
  { id: 'saturation', name: 'Saturation', min: 0, max: 200, default: 100, unit: '%' },
  { id: 'tint', name: 'Tint (Hue-Rotate)', min: -180, max: 180, default: 0, unit: 'deg' },
  { id: 'blur', name: 'Blur', min: 0, max: 10, default: 0, unit: 'px' },
  { id: 'sepia', name: 'Vintage (Sepia)', min: 0, max: 100, default: 0, unit: '%' },
  { id: 'grayscale', name: 'Grayscale', min: 0, max: 100, default: 0, unit: '%' }
];

export const FONT_LIST = [
  { id: 'inter', name: 'Classic (Inter)', class: 'font-sans' },
  { id: 'neon', name: 'Neon Lights', class: 'font-mono tracking-widest uppercase font-bold text-shadow-neon' },
  { id: 'club', name: 'Club Bold', class: 'font-black tracking-tighter uppercase italic' },
  { id: 'serif', name: 'Story Serif', class: 'font-serif italic' },
  { id: 'display', name: 'Stage Display', class: 'font-mono uppercase font-black' }
];

export const STICKER_TEMPLATES = [
  // DJ Exclusive Stickers
  { type: 'dj_now_playing', label: '💿 NOW PLAYING', defaultText: 'Leon Bassline - Acid Rave' },
  { type: 'dj_live_tonight', label: '🔥 LIVE TONIGHT', defaultText: '11:00 PM @ OMNIA' },
  { type: 'dj_performing_at', label: '🏟️ PERFORMING AT', defaultText: 'Stage-1 / Sunburn' },
  { type: 'dj_gear', label: '🎛️ GEAR USED', defaultText: 'Pioneer CDJ-3000' },
  { type: 'dj_bpm', label: '⏱️ BPM STICKER', defaultText: '130 BPM' },
  { type: 'dj_key', label: '🎵 MUSICAL KEY', defaultText: 'A Minor' },
  { type: 'dj_energy', label: '⚡ ENERGY LEVEL', defaultText: '⚡ 9/10' },
  // General Interactive Stickers
  { type: 'mention', label: '👤 MENTION', defaultText: '@username' },
  { type: 'hashtag', label: '# HASHTAG', defaultText: '#Nightlife' },
  { type: 'location', label: '📍 LOCATION', defaultText: 'Mumbai, India' },
  { type: 'countdown', label: '⏳ COUNTDOWN', defaultText: 'Event Starts In 2h' },
  { type: 'poll', label: '📊 POLL', defaultText: 'Techno vs House?' }
];

export const MUSIC_LIST_MOCK = [
  { title: 'Pixabay Tech Rave', artist: 'Zenith', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { title: 'Sunset House Mix', artist: 'Dusk', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { title: 'Cyber Stage Intro', artist: 'Retro', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
];
