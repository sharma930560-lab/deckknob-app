import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { userService } from '../../services/userService';

/**
 * MentionInput — a controlled input/textarea that detects @username typing
 * and shows a live dropdown of matching users from Firestore.
 *
 * Props:
 *   value             string    controlled value
 *   onChange          fn        called with new string value
 *   onMentionSelect   fn        called with { uid, username, profilePic } when user selected
 *   placeholder       string
 *   className         string
 *   multiline         bool      renders textarea if true
 *   rows              number
 */
export default function MentionInput({
  value = '',
  onChange,
  onMentionSelect,
  placeholder = 'Write something... @mention someone',
  className = '',
  multiline = false,
  rows = 4
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Detect @mention at caret position
  const detectMention = useCallback((text, caretPos) => {
    const before = text.slice(0, caretPos);
    const match = before.match(/@(\w*)$/);
    if (match) {
      return { query: match[1], start: before.length - match[0].length };
    }
    return null;
  }, []);

  const handleInput = (e) => {
    const text = e.target.value;
    onChange(text);

    const caret = e.target.selectionStart;
    const mention = detectMention(text, caret);

    if (mention) {
      setMentionQuery(mention.query);
      setMentionStart(mention.start);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (mention.query.length >= 1) {
          setLoading(true);
          try {
            const results = await userService.searchUsers(mention.query);
            setSuggestions(results.slice(0, 6));
            setShowSuggestions(true);
            setActiveSuggestion(0);
          } finally {
            setLoading(false);
          }
        } else {
          setSuggestions([]);
          setShowSuggestions(true);
        }
      }, 200);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionStart(-1);
      setMentionQuery('');
    }
  };

  const selectUser = useCallback((user) => {
    if (mentionStart === -1) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + mentionQuery.length);
    const newValue = before + '@' + user.username + ' ' + after;
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(-1);
    setMentionQuery('');
    onMentionSelect?.({
      uid: user.uid,
      username: user.username,
      profilePic: user.profilePic || user.profile_pic
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [value, mentionStart, mentionQuery, onChange, onMentionSelect]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions[activeSuggestion]) {
        e.preventDefault();
        selectUser(suggestions[activeSuggestion]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = () => setShowSuggestions(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const sharedProps = {
    ref: inputRef,
    value,
    onChange: handleInput,
    onKeyDown: handleKeyDown,
    onClick: e => e.stopPropagation(),
    placeholder,
    className: `dk-input w-full resize-none ${className}`,
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      {multiline ? (
        <textarea {...sharedProps} rows={rows} />
      ) : (
        <input {...sharedProps} type="text" />
      )}

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-zinc-400 text-sm">
                <div className="h-4 w-4 border-2 border-[#DFE104] border-t-transparent rounded-full animate-spin" />
                Searching...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-zinc-500">
                {mentionQuery
                  ? `No users found for "@${mentionQuery}"`
                  : 'Start typing a username...'}
              </div>
            ) : (
              <div className="py-1">
                {suggestions.map((user, idx) => (
                  <button
                    key={user.uid || user.id || idx}
                    onMouseDown={(e) => { e.preventDefault(); selectUser(user); }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === activeSuggestion
                        ? 'bg-[#DFE104]/10 text-white'
                        : 'text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <img
                      src={
                        user.profilePic ||
                        user.profile_pic ||
                        `https://ui-avatars.com/api/?name=${user.username}&background=DFE104&color=000&bold=true&size=64`
                      }
                      alt={user.username}
                      className="h-8 w-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">@{user.username}</p>
                      {user.displayName && (
                        <p className="text-xs text-zinc-500 truncate">{user.displayName}</p>
                      )}
                    </div>
                    {user.role && (
                      <span className="ml-auto flex-shrink-0 text-[10px] font-black uppercase tracking-wider text-[#DFE104] bg-[#DFE104]/10 px-2 py-0.5 rounded-full">
                        {user.role}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
