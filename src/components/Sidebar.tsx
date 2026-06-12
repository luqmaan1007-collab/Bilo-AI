import { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  X, 
  Flame, 
  Sparkles,
} from 'lucide-react';
import { Conversation } from '../types';
import logoIcon from '../assets/images/bilo_logo_icon_1779879703777.png';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: (mode: 'fun_rebel' | 'normal_witty') => void;
  onDeleteConversation: (id: string) => void;
  grokMode: 'fun_rebel' | 'normal_witty';
  onToggleGrokMode: (mode: 'fun_rebel' | 'normal_witty') => void;
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
  onLogout?: () => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  grokMode,
  onToggleGrokMode,
  isOpen,
  onClose,
  userEmail,
  isPro,
  onUpgrade,
  onLogout,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 flex w-76 flex-col border-r border-[#e5edf2] dark:border-slate-800 bg-white dark:bg-zinc-950 transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header - No text labels of "bilo ai" or "Bilo AI" */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-[#f0f4f7] dark:border-slate-850">
          {/* Symmetrical Minimalist Ice Crystal/Glacier Logo Symbol instead of any text brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#fafcfd] dark:bg-black border border-[#e1ebf1] dark:border-slate-800 overflow-hidden">
              <img 
                src={logoIcon} 
                alt="AI Assistant Glacier Logo" 
                referrerPolicy="no-referrer" 
                className="h-full w-full object-cover"
              />
            </div>
            {/* Soft geometric accent lines representing Greenland's icy layers */}
            <div className="flex flex-col gap-0.5">
              <span className="h-1 w-8 rounded-full bg-[#cbdcf2] dark:bg-cyan-900" />
              <span className="h-0.5 w-5 rounded-full bg-[#cbdcf2]/65 dark:bg-cyan-900/65" />
            </div>
          </div>

          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
            id="btn-close-sidebar"
            title="Collapse sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conversation Controls */}
        <div className="p-3.5 space-y-2">
           <button
            onClick={() => onNewConversation(grokMode)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white to-[#f4f7fa] dark:from-slate-850 dark:to-slate-800 px-4 py-3 text-xs font-medium tracking-wide text-slate-700 dark:text-slate-350 border border-[#dee8f0] dark:border-slate-750 shadow-2xs hover:border-cyan-200 dark:hover:border-cyan-800 transition-all duration-200 active:scale-98"
            id="btn-new-chat"
          >
            <Plus size={15} className="text-cyan-500" />
            START FRESH
          </button>
        </div>

        {/* Search Conversation History */}
        <div className="px-3.5 pb-2">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-100 dark:border-slate-300 bg-[#f7fafc] dark:bg-slate-100 px-3 py-1.5 text-[11px] text-slate-600 dark:text-black placeholder-slate-400 dark:placeholder-slate-505 focus:border-[#cbdcf2] dark:focus:border-slate-400 focus:bg-white dark:focus:bg-white focus:outline-hidden transition-all duration-200"
          />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <span className="text-[10px] font-mono tracking-wider text-slate-300 dark:text-slate-650">EMPTY HISTORY</span>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">No message history found.</p>
            </div>
          ) : (
            filteredConversations.map((convo) => {
              const isActive = convo.id === activeConversationId;
              return (
                <div
                  key={convo.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 ${
                    isActive
                      ? 'bg-[#f0f5fa] dark:bg-slate-800/60 border border-[#e1eaf3] dark:border-slate-700/80 shadow-2xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => onSelectConversation(convo.id)}
                    className="flex flex-1 items-start gap-2.5 text-left min-w-0"
                    id={`btn-convo-${convo.id}`}
                  >
                    <div className="mt-0.5 text-slate-400">
                      {convo.grokMode === 'fun_rebel' ? (
                        <Flame size={13} className="text-[#f59e0b]" />
                      ) : (
                        <Sparkles size={13} className="text-cyan-500" />
                      )}
                    </div>
                    <div className="truncate pr-4 flex-1">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {convo.title || 'Untitled Conversation'}
                      </p>
                      <span className="block text-[9px] font-mono text-slate-400/80 dark:text-slate-500 mt-0.5">
                        {convo.messages.length} message{convo.messages.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => onDeleteConversation(convo.id)}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-md p-1 text-slate-300 dark:text-slate-605 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-400 transition-all duration-150"
                    title="Delete Conversation"
                    id={`btn-delete-convo-${convo.id}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Identity and Log Out block */}
        {userEmail && (
          <div className="mt-auto border-t border-[#f0f4f7] dark:border-slate-800 bg-[#f9fbfd] dark:bg-black p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pt-2 mb-0.5" style={{borderTop: 'none'}}>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] font-mono font-bold tracking-widest text-[#a3b6cc] dark:text-slate-500 uppercase">
                  SESSION IDENTITY
                </span>
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-450 truncate mt-0.5" title={userEmail}>
                  {userEmail}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg border border-red-100 dark:border-red-950/40 bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-900/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-650 dark:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors shrink-0 ml-2"
                title="Log out from user account"
                id="btn-sidebar-logout"
              >
                Log Out
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-[#f1f5f9] dark:border-slate-800 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase">ACTIVE_SECURE</span>
              </div>
              <span className="text-[9px] font-mono text-slate-300 dark:text-slate-600 font-bold">AGNES-CORE</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
