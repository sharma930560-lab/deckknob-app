import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MotionPage from '../components/ui/MotionPage';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import EmojiPicker from '../components/ui/EmojiPicker';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { auth } from '../config/firebase';
import authStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';

function formatTimestampTime(ts) {
  if (!ts) return '';
  let date;
  if (ts?.toDate) date = ts.toDate();
  else if (ts instanceof Date) date = ts;
  else if (typeof ts === 'number') date = new Date(ts);
  else if (ts?.seconds) date = new Date(ts.seconds * 1000);
  else date = new Date(ts);

  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeInboxTime(ts) {
  if (!ts) return '';
  let date;
  if (ts?.toDate) date = ts.toDate();
  else if (ts instanceof Date) date = ts;
  else if (typeof ts === 'number') date = new Date(ts);
  else if (ts?.seconds) date = new Date(ts.seconds * 1000);
  else date = new Date(ts);

  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMinutes = Math.floor((now - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = authStore();
  const { showToast } = useToast();

  const [authUid, setAuthUid] = useState(auth.currentUser?.uid || null);
  const [isAuthChecking, setIsAuthChecking] = useState(!auth.currentUser?.uid);

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState(searchParams.get('chat') || null);
  const [chatProfiles, setChatProfiles] = useState({}); // { [uid]: profileData }

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  // New Chat Modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchUserInput, setSearchUserInput] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [searchUserLoading, setSearchUserLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);

  // 1. Ensure Firebase Auth is verified and active before issuing queries
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthUid(user ? user.uid : null);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const currentUid = authUid;

  // 2. Subscribe to user's chats only once authenticated
  useEffect(() => {
    if (!currentUid) {
      if (!isAuthChecking) setChatsLoading(false);
      return;
    }

    setChatsLoading(true);
    const unsubscribe = chatService.subscribeChats(
      currentUid,
      (incomingChats) => {
        setChats(incomingChats);
        setChatsLoading(false);
      },
      (err) => {
        console.warn('[Messages] chat subscription error:', err?.message || err);
        setChatsLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUid, isAuthChecking]);

  // 3. Fetch participant profiles
  useEffect(() => {
    if (!currentUid || chats.length === 0) return;

    const uidsToFetch = new Set();
    chats.forEach((chat) => {
      const otherUid = chat.participants?.find((id) => id !== currentUid);
      if (otherUid && !chatProfiles[otherUid]) {
        uidsToFetch.add(otherUid);
      }
    });

    if (uidsToFetch.size === 0) return;

    uidsToFetch.forEach(async (uid) => {
      try {
        const profile = await userService.getUserProfile(uid);
        if (profile) {
          setChatProfiles((prev) => ({ ...prev, [uid]: profile }));
        }
      } catch (e) {
        console.warn('[Messages] profile fetch failed for', uid, e);
      }
    });
  }, [chats, currentUid, chatProfiles]);

  // 4. Handle ?user=uid query param (start / open chat from profile)
  useEffect(() => {
    const targetUid = searchParams.get('user');
    if (targetUid && currentUid && targetUid !== currentUid) {
      (async () => {
        try {
          const chatId = await chatService.createChat(currentUid, targetUid);
          setActiveChatId(chatId);
          setSearchParams({ chat: chatId });
          if (!chatProfiles[targetUid]) {
            const profile = await userService.getUserProfile(targetUid);
            if (profile) setChatProfiles((prev) => ({ ...prev, [targetUid]: profile }));
          }
        } catch (err) {
          showToast(err.message || 'Cannot open conversation.', 'error');
        }
      })();
    }
  }, [searchParams, currentUid]);

  // 5. Subscribe to messages in active chat
  useEffect(() => {
    if (!activeChatId || !currentUid) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    const unsubscribe = chatService.subscribeMessages(
      activeChatId,
      (incomingMessages) => {
        setMessages(incomingMessages);
        setMessagesLoading(false);
      },
      (err) => {
        console.warn('[Messages] messages subscription error:', err?.message || err);
        setMessagesLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeChatId, currentUid]);

  // 6. Safe block check: only inspect current user's block list
  useEffect(() => {
    if (!activeChatId || !currentUid) return;
    const currentChat = chats.find((c) => c.id === activeChatId);
    const otherUid = currentChat?.participants?.find((id) => id !== currentUid);
    if (!otherUid) {
      setIsBlocked(false);
      return;
    }

    (async () => {
      try {
        const blockedByMe = await userService.isBlocked(currentUid, otherUid);
        setIsBlocked(blockedByMe);
      } catch {
        setIsBlocked(false);
      }
    })();
  }, [activeChatId, currentUid, chats]);

  // 7. Auto-scroll messages to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 8. Mark active chat as read
  useEffect(() => {
    if (activeChatId && currentUid && messages.length > 0) {
      chatService.markChatRead(activeChatId, currentUid).catch(() => {});
    }
  }, [activeChatId, currentUid, messages.length]);

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChatId || !currentUid || isSending || isBlocked) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setShowEmojiPicker(false);
    setIsSending(true);

    try {
      await chatService.sendMessage(activeChatId, currentUid, textToSend);
      textInputRef.current?.focus();
    } catch (err) {
      showToast(err.message || 'Message could not be sent.', 'error');
      setMessageText(textToSend); // Restore unsent message
    } finally {
      setIsSending(false);
    }
  };

  // Search users to start new chat
  const handleSearchUser = async (val) => {
    setSearchUserInput(val);
    const clean = val.replace(/^@/, '').trim().toLowerCase();
    if (!clean) {
      setFoundUsers([]);
      return;
    }
    setSearchUserLoading(true);
    try {
      const results = await userService.searchUsers(clean, 10);
      const filtered = results.filter((u) => u.uid !== currentUid && u.id !== currentUid);
      setFoundUsers(filtered);
    } catch {
      setFoundUsers([]);
    } finally {
      setSearchUserLoading(false);
    }
  };

  const handleStartChatWithUser = async (targetUid) => {
    if (!currentUid || !targetUid || targetUid === currentUid) return;
    try {
      const chatId = await chatService.createChat(currentUid, targetUid);
      setActiveChatId(chatId);
      setIsNewChatOpen(false);
      setSearchUserInput('');
      setFoundUsers([]);
      setSearchParams({ chat: chatId });
    } catch (err) {
      showToast(err.message || 'Could not start conversation.', 'error');
    }
  };

  // Active chat participant info
  const activeChat = chats.find((c) => c.id === activeChatId);
  const otherParticipantUid = activeChat?.participants?.find((id) => id !== currentUid);
  const otherParticipantProfile = otherParticipantUid ? chatProfiles[otherParticipantUid] : null;
  const otherUsername = otherParticipantProfile?.username || 'user';
  const otherAvatar =
    otherParticipantProfile?.profilePic ||
    otherParticipantProfile?.profile_pic ||
    `https://ui-avatars.com/api/?name=${otherUsername}&background=DFE104&color=000&bold=true`;

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true;
    const otherUid = c.participants?.find((id) => id !== currentUid);
    const prof = otherUid ? chatProfiles[otherUid] : null;
    const query = searchQuery.toLowerCase();
    return (
      prof?.username?.toLowerCase().includes(query) ||
      prof?.name?.toLowerCase().includes(query) ||
      c.lastMessage?.toLowerCase().includes(query)
    );
  });

  if (!isAuthChecking && !currentUid) {
    return (
      <MotionPage className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-[#DFE104]/10 grid place-items-center text-2xl">
          💬
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Messages</h2>
        <p className="text-sm text-zinc-400 mb-6">Log in to view your direct messages and chat with selectors.</p>
        <Link
          to="/auth"
          className="inline-block px-6 py-2.5 rounded-full bg-[#DFE104] text-black font-bold text-sm hover:bg-[#DFE104]/90 transition-all"
        >
          Log In
        </Link>
      </MotionPage>
    );
  }

  return (
    <MotionPage className="mx-auto max-w-5xl px-0 sm:px-4 py-0 sm:py-4">
      {/* Container: Instagram DM-style split/mobile layout */}
      <div className="overflow-hidden sm:rounded-3xl bg-[#09090B] sm:border sm:border-white/[0.08] h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-6rem)] flex shadow-xl">
        
        {/* ── 1. INBOX LIST (Visible on desktop, or on mobile when no active chat) ── */}
        <aside
          className={`${
            activeChatId ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-88 flex-col border-r border-white/[0.06] bg-[#09090B] shrink-0`}
        >
          {/* Inbox Header: Messages + (+) icon */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <h1 className="text-lg font-bold text-white tracking-tight">Messages</h1>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-[#DFE104] hover:text-black grid place-items-center text-zinc-300 transition-colors"
              title="New Message"
              aria-label="New Message"
            >
              <IconsaxAnimated name="add" size={18} />
            </button>
          </div>

          {/* Search bar: "Search messages" */}
          <div className="p-3 border-b border-white/[0.04]">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <IconsaxAnimated name="search" size={15} />
              </span>
              <input
                type="text"
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white/[0.04] text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#DFE104]/50 border border-transparent"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {chatsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-sm font-semibold text-zinc-400">No messages yet</p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="mt-3 px-4 py-1.5 rounded-full bg-[#DFE104] text-black font-bold text-xs hover:bg-[#DFE104]/80 transition-all"
                >
                  New Message
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const otherUid = chat.participants?.find((id) => id !== currentUid);
                const prof = otherUid ? chatProfiles[otherUid] : null;
                const isActive = chat.id === activeChatId;
                const uname = prof?.username || 'user';
                const av =
                  prof?.profilePic ||
                  prof?.profile_pic ||
                  `https://ui-avatars.com/api/?name=${uname}&background=DFE104&color=000&bold=true`;
                const isUnread = Boolean(
                  chat.lastSenderId &&
                  chat.lastSenderId !== currentUid &&
                  (!chat.readBy || !chat.readBy.includes(currentUid))
                );

                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setSearchParams({ chat: chat.id });
                    }}
                    className={`w-full px-3.5 py-3 flex items-center gap-3 text-left transition-colors border-b border-white/[0.02] ${
                      isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={av}
                        alt={uname}
                        className="h-11 w-11 rounded-full object-cover border border-white/10"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-semibold truncate ${isUnread ? 'text-white' : 'text-zinc-200'}`}>
                          @{uname}
                        </span>
                        <span className={`text-[10px] whitespace-nowrap ${isUnread ? 'text-[#DFE104] font-bold' : 'text-zinc-500'}`}>
                          {formatRelativeInboxTime(chat.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${isUnread ? 'text-white font-semibold' : 'text-zinc-400'}`}>
                          {chat.lastMessage || 'Sent an attachment'}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-[#DFE104] shrink-0" title="Unread" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── 2. CHAT SCREEN (Visible on desktop, or on mobile when chat is active) ── */}
        <main
          className={`${
            !activeChatId ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col bg-[#09090B] relative min-w-0`}
        >
          {activeChatId ? (
            <>
              {/* Header: back button, user avatar, username, optional profile shortcut */}
              <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#09090B]/95 backdrop-blur z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => {
                      setActiveChatId(null);
                      setSearchParams({});
                    }}
                    className="md:hidden h-8 w-8 rounded-full hover:bg-white/[0.08] grid place-items-center text-zinc-300 transition-colors"
                    aria-label="Back"
                  >
                    <IconsaxAnimated name="arrow-left" size={18} />
                  </button>

                  <Link
                    to={`/profile/${otherUsername}`}
                    className="flex items-center gap-2.5 min-w-0 group"
                  >
                    <img
                      src={otherAvatar}
                      alt={otherUsername}
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-white/10 group-hover:border-[#DFE104] transition-colors"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[#DFE104] transition-colors truncate">
                        @{otherUsername}
                      </p>
                    </div>
                  </Link>
                </div>

                <Link
                  to={`/profile/${otherUsername}`}
                  className="text-xs font-semibold text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  Profile
                </Link>
              </div>

              {/* Blocked alert */}
              {isBlocked && (
                <div className="bg-rose-500/10 px-4 py-2 text-xs text-rose-300 text-center font-medium">
                  Direct messaging is restricted with this account.
                </div>
              )}

              {/* Chat bubbles area */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 no-scrollbar">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="h-6 w-6 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 py-8">
                    <img
                      src={otherAvatar}
                      alt={otherUsername}
                      className="h-14 w-14 rounded-full object-cover border border-[#DFE104]/50 mb-2.5"
                    />
                    <p className="text-sm font-bold text-white">@{otherUsername}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Say hi to @{otherUsername} 👋</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] sm:max-w-md px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                            isMe
                              ? 'bg-[#DFE104] text-black font-medium rounded-br-sm'
                              : 'bg-zinc-800 text-white rounded-bl-sm border border-white/[0.04]'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-0.5 px-1">
                          {formatTimestampTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom message input bar */}
              <div className="p-2.5 sm:p-3 border-t border-white/[0.06] bg-[#09090B] relative pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                <AnimatePresence>
                  {showEmojiPicker && (
                    <EmojiPicker
                      className="absolute bottom-full left-3 mb-2 z-30"
                      onSelect={(emoji) => {
                        setMessageText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </AnimatePresence>

                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="h-9 w-9 rounded-full hover:bg-white/[0.06] grid place-items-center text-base text-zinc-400 hover:text-white transition-colors shrink-0"
                    title="Emoji"
                  >
                    😊
                  </button>

                  <input
                    ref={textInputRef}
                    type="text"
                    placeholder={isBlocked ? 'Messaging restricted' : `Message @${otherUsername}...`}
                    disabled={isBlocked || isSending}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-full text-xs sm:text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 focus:outline-none focus:border-[#DFE104] disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim() || isSending || isBlocked}
                    className="h-9 w-9 rounded-full bg-[#DFE104] text-black grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#DFE104]/80 transition-all shrink-0 active:scale-95"
                    aria-label="Send"
                  >
                    {isSending ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-black border-t-transparent animate-spin inline-block" />
                    ) : (
                      <IconsaxAnimated name="send" size={16} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Desktop placeholder when no conversation is active */
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-500">
              <div className="h-16 w-16 rounded-full bg-white/[0.04] border border-white/[0.08] grid place-items-center text-zinc-300 mb-3">
                <IconsaxAnimated name="messages" size={28} />
              </div>
              <h2 className="text-base font-bold text-white">Your Messages</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Send private messages and connect directly with selectors.
              </p>
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="mt-4 px-4 py-2 rounded-full bg-[#DFE104] text-black font-bold text-xs hover:bg-[#DFE104]/90 transition-all"
              >
                Send Message
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL: New Message ── */}
      <AnimatePresence>
        {isNewChatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <button
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsNewChatOpen(false)}
              aria-label="Close"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl bg-[#09090B] border border-white/[0.1] p-4 sm:p-5 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white">New Message</h3>
                <button
                  onClick={() => setIsNewChatOpen(false)}
                  className="h-7 w-7 rounded-full hover:bg-white/[0.1] grid place-items-center text-zinc-400 hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">@</span>
                  <input
                    type="text"
                    placeholder="Search username"
                    value={searchUserInput}
                    onChange={(e) => handleSearchUser(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl text-xs bg-white/[0.04] text-white border border-white/[0.08] focus:outline-none focus:border-[#DFE104]"
                    autoFocus
                  />
                </div>

                <div className="min-h-[100px] max-h-[240px] overflow-y-auto no-scrollbar space-y-1.5">
                  {searchUserLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-5 w-5 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin" />
                    </div>
                  ) : foundUsers.length > 0 ? (
                    foundUsers.map((u) => (
                      <div
                        key={u.uid || u.id}
                        className="w-full p-2 rounded-xl hover:bg-white/[0.04] flex items-center justify-between gap-2.5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              u.profilePic ||
                              u.profile_pic ||
                              `https://ui-avatars.com/api/?name=${u.username}&background=DFE104&color=000&bold=true`
                            }
                            alt={u.username}
                            className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
                          />
                          <p className="text-xs font-semibold text-white truncate">@{u.username}</p>
                        </div>
                        <button
                          onClick={() => handleStartChatWithUser(u.uid || u.id)}
                          className="px-3 py-1 rounded-full bg-[#DFE104] text-black text-xs font-bold hover:bg-[#DFE104]/80 transition-all shrink-0"
                        >
                          Chat
                        </button>
                      </div>
                    ))
                  ) : searchUserInput.trim() ? (
                    <p className="text-xs text-zinc-500 text-center py-6">No user found</p>
                  ) : (
                    <p className="text-xs text-zinc-600 text-center py-6">Type a username to start a chat</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}
