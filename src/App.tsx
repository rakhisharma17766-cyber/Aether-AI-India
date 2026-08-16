import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  Bot,
  Terminal,
  Image as ImageIcon,
  Cpu,
  Zap,
  Layers,
  ArrowRight,
  Shield,
  Clock,
} from 'lucide-react';
import {
  Message,
  Conversation,
  UserPreferences,
  ReasoningLevel,
  Attachment,
  GeneratedImagePayload,
} from './types';
import { GEMINI_MODELS } from './config/models';
import { AI_PERSONAS } from './config/personas';
import { generateGeminiResponse } from './services/geminiService';
import {
  initFirebase,
  loginWithGoogle,
  loginAnonymously,
  logoutUser,
  subscribeToAuth,
  saveConversation,
  loadConversations,
  deleteSavedConversation,
  purgeExpiredData,
  getCachedAuthUser,
} from './services/firebaseService';

// UI Components
import { TopHUDNavbar } from './components/TopHUDNavbar';
import { SidebarDrawer } from './components/SidebarDrawer';
import { PromptInputBar } from './components/PromptInputBar';
import { ChatMessageCard } from './components/ChatMessageCard';
import { VoiceHUDModal } from './components/VoiceHUDModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { SettingsModal } from './components/SettingsModal';
import { FeedbackModal } from './components/FeedbackModal';
import { RenameChatModal } from './components/RenameChatModal';
import { ApiKeyBanner } from './components/ApiKeyBanner';

export function App() {
  // Authentication State with browser persistence
  const [user, setUser] = useState<User | null>(() => {
    const cached = getCachedAuthUser();
    return cached ? (cached as unknown as User) : null;
  });

  // Conversations & Messages State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);

  // Model & Reasoning Settings
  const [currentModel, setCurrentModel] = useState<string>('gemini-3.7-flash');
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>('standard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | undefined>(undefined);
  const [totalTokens, setTotalTokens] = useState<number>(0);

  // User Preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    apiKey: '',
    selectedModel: 'gemini-3.7-flash',
    reasoningLevel: 'standard',
    enableSearchGrounding: true,
    enableThinking: true,
    personaId: 'quantum_architect',
    customSystemPrompt: AI_PERSONAS[0].systemInstruction,
    ttsVoice: 'Kore',
    ttsSpeed: 1.0,
    imageResolution: '1K',
    imageAspectRatio: '1:1',
    soundEffects: true,
  });

  // Modal Control States
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [renameModalOpen, setRenameModalOpen] = useState<boolean>(false);
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<GeneratedImagePayload | null>(null);
  const [bannerVisible, setBannerVisible] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Firebase and subscribe to auth
  useEffect(() => {
    initFirebase();
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
    });

    // Load custom key from local storage
    const savedKey = localStorage.getItem('aether_custom_api_key');
    if (savedKey) {
      setPreferences((prev) => ({ ...prev, apiKey: savedKey }));
    }

    // 60-Day Data Retention Sweeper: Initial sweep + recurring 30m timer
    purgeExpiredData(null).catch(() => {});
    const purgeInterval = setInterval(() => {
      purgeExpiredData(user).catch(() => {});
    }, 30 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(purgeInterval);
    };
  }, []);

  // 2. Load conversations when user or auth state resolves
  useEffect(() => {
    async function fetchSessions() {
      const list = await loadConversations(user);
      if (list.length > 0) {
        setConversations(list);
        const latest = list[0];
        setActiveConversationId(latest.id);
        setMessages(latest.messages || []);
        setCurrentModel(latest.model || 'gemini-3.7-flash');
        setReasoningLevel(latest.reasoningLevel || 'standard');
      } else {
        createNewConversation();
      }
    }
    fetchSessions();
  }, [user]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Active Conversation Object
  const currentConversation = conversations.find((c) => c.id === activeConversationId);

  // Create New Transmission Session
  const createNewConversation = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Transmission',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: currentModel,
      reasoningLevel,
      messages: [],
    };
    const updatedList = [newConv, ...conversations];
    setConversations(updatedList);
    setActiveConversationId(newId);
    setMessages([]);
    saveConversation(newConv, user);
  };

  // Switch Conversation
  const handleSelectConversation = (id: string) => {
    const target = conversations.find((c) => c.id === id);
    if (target) {
      setActiveConversationId(id);
      setMessages(target.messages || []);
      setCurrentModel(target.model || 'gemini-3.7-flash');
      setReasoningLevel(target.reasoningLevel || 'standard');
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string) => {
    await deleteSavedConversation(id, user);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (activeConversationId === id) {
      if (updated.length > 0) {
        setActiveConversationId(updated[0].id);
        setMessages(updated[0].messages || []);
      } else {
        createNewConversation();
      }
    }
  };

  // Rename Conversation
  const handleRenameConversation = (newTitle: string) => {
    if (!currentConversation) return;
    const updated = { ...currentConversation, title: newTitle, updatedAt: Date.now() };
    const updatedList = conversations.map((c) => (c.id === currentConversation.id ? updated : c));
    setConversations(updatedList);
    saveConversation(updated, user);
  };

  // Clear Messages in Active Conversation
  const handleClearChat = () => {
    if (!currentConversation) return;
    setMessages([]);
    const updated = { ...currentConversation, messages: [], updatedAt: Date.now() };
    const updatedList = conversations.map((c) => (c.id === currentConversation.id ? updated : c));
    setConversations(updatedList);
    saveConversation(updated, user);
  };

  // Handle Reasoning Switch
  const handleChangeReasoningLevel = (level: ReasoningLevel) => {
    setReasoningLevel(level);
    if (level === 'max') {
      setCurrentModel('gemini-3.1-pro-preview');
    } else if (level === 'standard' && currentModel === 'gemini-3.1-pro-preview') {
      setCurrentModel('gemini-3.7-flash');
    }
  };

  // Send Prompt Message Function (Anti-405, Multimodal Vision, Image Generation Auto-Routing)
  const handleSendMessage = async (
    text: string,
    attachments: Attachment[] = [],
    imageRes?: '1K' | '2K' | '4K'
  ) => {
    if (!text && attachments.length === 0) return;

    // Create user message
    const userMsg: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Auto-name conversation on first message
    let conversationTitle = currentConversation?.title || 'New Transmission';
    if (messages.length === 0) {
      conversationTitle = text.slice(0, 32) || 'Visual Analysis';
    }

    const startTime = Date.now();

    try {
      const result = await generateGeminiResponse({
        model: currentModel,
        prompt: text,
        conversationHistory: messages,
        attachments,
        reasoningLevel,
        enableSearchGrounding: preferences.enableSearchGrounding,
        enableThinking: preferences.enableThinking,
        systemInstruction: preferences.customSystemPrompt,
        apiKey: preferences.apiKey,
        imageResolution: imageRes || preferences.imageResolution,
        imageAspectRatio: preferences.imageAspectRatio,
      });

      const latency = Date.now() - startTime;
      setLastLatencyMs(latency);
      setTotalTokens((prev) => prev + (result.tokensUsed || 0));

      const aiMsg: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'model',
        content: result.text,
        timestamp: Date.now(),
        modelUsed: result.modelUsed,
        latencyMs: latency,
        tokensUsed: result.tokensUsed,
        groundingSources: result.groundingSources,
        thinkingContent: result.thinkingContent,
        generatedImages: result.generatedImages,
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // Save conversation
      if (currentConversation) {
        const updatedConv: Conversation = {
          ...currentConversation,
          title: conversationTitle,
          messages: finalMessages,
          updatedAt: Date.now(),
          model: currentModel,
          reasoningLevel,
        };
        const updatedList = conversations.map((c) =>
          c.id === currentConversation.id ? updatedConv : c
        );
        setConversations(updatedList);
        saveConversation(updatedConv, user);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errorMsg: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'model',
        content: `### ⚠️ Transmission Interference Detected\n\n${errMsg}\n\n*Tip: Check API key authentication in Settings or verify network connectivity.*`,
        timestamp: Date.now(),
        modelUsed: currentModel,
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry previous AI transmission
  const handleRetryMessage = (messageId: string) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx > 0) {
      const prevUserMsg = messages[idx - 1];
      if (prevUserMsg && prevUserMsg.role === 'user') {
        handleSendMessage(prevUserMsg.content, prevUserMsg.attachments);
      }
    }
  };

  // Quick Starter Prompts
  const starterCards = [
    {
      title: 'Neural Architecture Analysis',
      prompt: 'Analyze high-throughput distributed microservice architectures with zero-loss fallback strategies.',
      icon: Terminal,
      badge: 'Analysis',
    },
    {
      title: 'Generate 4K Cyber City',
      prompt: 'Create image of a breathtaking futuristic neon cyberpunk metropolis with floating holographic HUD screens and reflective rain slicked roads in 4K.',
      icon: ImageIcon,
      badge: 'Visual 4K',
    },
    {
      title: 'Deep Math Reasoning',
      prompt: 'Provide a step-by-step rigorous proof and intuition for the convergence of gradient descent in non-convex optimization.',
      icon: Cpu,
      badge: 'Max Think',
    },
    {
      title: 'Real-Time Web Intelligence',
      prompt: 'Summarize the latest developments in generative multimodal foundation models released this week.',
      icon: Zap,
      badge: 'Search Grounded',
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#05060a] text-slate-200 font-sans p-2 sm:p-3 md:p-4 gap-3 md:gap-4 selection:bg-sky-500/30 selection:text-sky-200">
      {/* Left Sidebar Navigation Drawer */}
      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={() => setRenameModalOpen(true)}
        user={user}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden space-y-3 md:space-y-4">
        {/* Optional Top API Key Info Banner */}
        <ApiKeyBanner
          isVisible={bannerVisible}
          onDismiss={() => setBannerVisible(false)}
          onOpenSettings={() => setSettingsModalOpen(true)}
        />

        {/* Top Futuristic HUD Navbar */}
        <TopHUDNavbar
          currentModel={currentModel}
          onSelectModel={(modelId) => setCurrentModel(modelId)}
          reasoningLevel={reasoningLevel}
          onChangeReasoningLevel={handleChangeReasoningLevel}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenVoiceMode={() => setVoiceModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onOpenFeedback={() => setFeedbackModalOpen(true)}
          onNewChat={createNewConversation}
          onRenameChat={() => setRenameModalOpen(true)}
          onClearChat={handleClearChat}
          conversationTitle={currentConversation?.title}
          lastLatencyMs={lastLatencyMs}
          tokensCount={totalTokens}
        />

        {/* Central Chat Feed */}
        <main className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            /* Welcome / Starter HUD Grid */
            <div className="max-w-4xl mx-auto min-h-[55vh] flex flex-col items-center justify-center text-center py-6 animate-in fade-in duration-300">
              {/* Central Geometric Icon */}
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/40 orb-glow">
                  <div className="w-8 h-8 rounded-sm bg-sky-400 rotate-45 shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold font-sans text-white tracking-tight mb-2">
                AETHER <span className="text-sky-400">INTELLIGENCE</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-lg mb-8 font-sans leading-relaxed">
                Next-generation glassmorphism AI workstation with bulletproof zero-405 REST architecture, multimodal vision, 4K image generation, and Google Firebase cloud persistence with 60-day lifecycle auto-purge.
              </p>

              {/* Starter Command Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl text-left">
                {starterCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="p-4 rounded-2xl glass-panel hover:bg-white/5 border border-white/10 hover:border-sky-400/40 transition-all duration-200 group cursor-pointer text-left flex flex-col justify-between shadow-lg hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                          <span className="font-semibold text-xs text-slate-200 group-hover:text-sky-200 font-sans">
                            {card.title}
                          </span>
                        </div>
                        <span className="text-[10px] border border-white/10 px-2 py-0.5 rounded bg-white/5 hud-text text-sky-300 uppercase">
                          {card.badge}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-400 group-hover:text-slate-300 line-clamp-2 leading-relaxed">
                        {card.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Render Messages List */
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg) => (
                <ChatMessageCard
                  key={msg.id}
                  message={msg}
                  onRetry={handleRetryMessage}
                  onImageZoom={(img) => setPreviewImage(img)}
                  onRegenerateImage={(prompt) => handleSendMessage(`Generate image of ${prompt}`)}
                  apiKey={preferences.apiKey}
                  ttsVoice={preferences.ttsVoice}
                />
              ))}

              {/* Streaming / Inference Loading Indicator */}
              {isLoading && (
                <div className="w-full flex justify-start py-3 animate-in fade-in duration-200">
                  <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border-l-4 border-l-sky-500 max-w-md shadow-xl">
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/50 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-sm bg-sky-400 rotate-45 animate-spin" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs hud-text text-sky-300 uppercase">
                        AETHER IS INFERRING...
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Synthesizing response with {currentModel}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Fixed Futuristic Prompt Input Bar */}
        <PromptInputBar
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStopGeneration={() => setIsLoading(false)}
          onOpenVoiceMode={() => setVoiceModalOpen(true)}
          onOpenCameraCapture={() => setCameraModalOpen(true)}
          currentModel={currentModel}
        />
      </div>

      {/* Global Interactive Modals */}
      <VoiceHUDModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        currentModel={currentModel}
        apiKey={preferences.apiKey}
        ttsVoice={preferences.ttsVoice}
        systemInstruction={preferences.customSystemPrompt}
      />

      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
        onRegenerate={(prompt) => handleSendMessage(`Generate image of ${prompt}`)}
      />

      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(att) => {
          handleSendMessage('Please analyze this optical capture in detail.', [att]);
        }}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        preferences={preferences}
        onSavePreferences={(updated) => setPreferences(updated)}
        user={user}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
      />

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        userEmail={user?.email || undefined}
        userId={user?.uid || undefined}
      />

      <RenameChatModal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        currentTitle={currentConversation?.title || ''}
        onRename={handleRenameConversation}
      />
    </div>
  );
}

export default App;
