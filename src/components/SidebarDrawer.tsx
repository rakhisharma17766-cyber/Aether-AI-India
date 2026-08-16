import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  MessageSquarePlus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  LogIn,
  LogOut,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  X,
} from 'lucide-react';
import { Conversation } from '../types';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  user,
  onLogin,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 lg:hidden"
        />
      )}

      {/* Drawer Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 lg:w-64 glass-panel lg:rounded-3xl z-50 flex flex-col p-4 lg:p-5 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:static lg:z-10 lg:h-full shrink-0`}
      >
        {/* Top Header: Geometric Logo & Branding */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/40 shrink-0">
              <div className="w-5 h-5 rounded-sm bg-sky-400 rotate-45 shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-sans leading-none">
                AETHER <span className="text-sky-400">AI</span>
              </span>
              <span className="text-[9px] hud-text text-slate-500 uppercase tracking-widest mt-1">
                QUANTUM CORE
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Button: Accent Gradient New Chat */}
        <button
          id="sidebar-new-chat-btn"
          onClick={() => {
            onNewConversation();
            onClose();
          }}
          className="w-full py-3 mb-5 rounded-xl font-semibold accent-gradient text-white flex items-center justify-center space-x-2 shadow-lg shadow-sky-950/40 hover:opacity-95 transition-all cursor-pointer font-sans text-xs tracking-wider"
        >
          <span className="text-base font-light">+</span>
          <span className="hud-text">NEW TRANSMISSION</span>
        </button>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search archives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl glass-card text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors font-sans"
            />
          </div>
        </div>

        {/* Archives Category Header & Conversations List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
          <div className="text-[10px] hud-text text-slate-500 uppercase px-2 py-1">
            Recent Archives ({filteredConversations.length})
          </div>

          {filteredConversations.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">
              No sessions archived
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  className={`group relative rounded-xl transition-all flex items-center justify-between p-3 cursor-pointer ${
                    isActive
                      ? 'glass-card border-sky-500/40 bg-sky-500/10 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.1)]'
                      : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 mr-1">
                    <div
                      className={`w-2 h-2 rounded-sm rotate-45 shrink-0 ${
                        isActive ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-slate-600'
                      }`}
                    />
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-medium truncate font-sans">
                        {conv.title || 'Untitled Transmission'}
                      </span>
                      <span className="text-[10px] hud-text text-slate-500">
                        {new Date(conv.updatedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Rename / Delete) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameConversation(conv.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-white/10"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Operator Identity Card */}
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            {user ? (
              user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-sky-400/40 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-sky-300 shrink-0">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              )
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-sm bg-sky-400/60 rotate-45" />
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-slate-200 truncate">
                {user ? user.displayName || 'Principal Eng.' : 'Principal Eng.'}
              </span>
              <span className="text-[10px] hud-text text-emerald-400">
                ● ONLINE
              </span>
            </div>
          </div>

          {user ? (
            <button
              id="logout-btn"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              title="Disconnect Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              id="google-login-btn"
              onClick={onLogin}
              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/5 transition-colors"
              title="Sign in with Google Firebase"
            >
              <LogIn className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
