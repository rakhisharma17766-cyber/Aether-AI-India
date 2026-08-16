import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
  signInAnonymously,
  Auth,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Firestore,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Conversation, FeedbackData, Message } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// 60 Days retention period in milliseconds
export const RETENTION_PERIOD_MS = 60 * 24 * 60 * 60 * 1000;

// Initialize Firebase App
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Ensure local persistence for browser sessions
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase setPersistence notice:', err);
  });
}

export interface CachedAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export function getCachedAuthUser(): CachedAuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('aether_auth_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCachedAuthUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user && !user.isAnonymous) {
      const cached: CachedAuthUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous,
      };
      localStorage.setItem('aether_auth_user', JSON.stringify(cached));
    } else {
      localStorage.removeItem('aether_auth_user');
    }
  } catch (e) {
    console.warn('Could not save cached user in localStorage', e);
  }
}

// Connection testing as mandated by skill guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase network warning: Client is offline or database initializing.');
    }
    return false;
  }
}

export function initFirebase(): Promise<boolean> {
  return testConnection();
}

// Run initial connection test on module evaluation
testConnection().catch(() => {});

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentAuth = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo: currentAuth?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to sanitize message objects so they fit comfortably in Firestore
function sanitizeMessagesForFirestore(messages: Message[]): any[] {
  return messages.slice(-50).map((m) => ({
    id: m.id,
    role: m.role,
    content: (m.content || '').slice(0, 50000),
    timestamp: m.timestamp || Date.now(),
    modelUsed: m.modelUsed || 'gemini-3.7-flash',
    latencyMs: m.latencyMs || 0,
    tokensUsed: m.tokensUsed || 0,
    thinkingContent: m.thinkingContent ? m.thinkingContent.slice(0, 10000) : null,
    groundingSources: m.groundingSources || [],
    generatedImages: m.generatedImages || [],
    attachments: (m.attachments || []).map((att) => ({
      id: att.id,
      name: att.name,
      mimeType: att.mimeType,
      type: att.type,
      // store small thumbnails or exclude giant base64 to preserve Firestore 1MB doc limits
      dataUrl: att.type === 'image' && att.dataUrl.length < 200000 ? att.dataUrl : '',
      base64Data: '',
    })),
  }));
}

// Sync user profile to Firestore `/users/{userId}`
export async function syncUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existingDoc = await getDoc(userDocRef);
    const nowIso = new Date().toISOString();

    if (!existingDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || 'user@aether.ai',
        displayName: (user.displayName || 'Operator').slice(0, 128),
        photoURL: (user.photoURL || '').slice(0, 500),
        createdAt: nowIso,
        lastLoginAt: nowIso,
      });
    } else {
      const data = existingDoc.data();
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || data.email || 'user@aether.ai',
          displayName: (user.displayName || data.displayName || 'Operator').slice(0, 128),
          photoURL: (user.photoURL || data.photoURL || '').slice(0, 500),
          createdAt: data.createdAt || nowIso,
          lastLoginAt: nowIso,
        },
        { merge: true }
      );
    }
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    } catch {
      // Local fallback
    }
  }
}

// Auth operations
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    if (result.user) {
      saveCachedAuthUser(result.user);
      await syncUserProfile(result.user);
      // Run automatic 60-day purge upon successful authentication
      purgeExpiredData(result.user).catch((e) => console.warn('60-day cleanup notice:', e));
    }
    return result.user;
  } catch (err) {
    console.warn('Google Popup sign in fallback to anonymous session', err);
    try {
      const anonResult = await signInAnonymously(auth);
      return anonResult.user;
    } catch {
      return null;
    }
  }
}

export async function loginAnonymously(): Promise<User | null> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err) {
    console.warn('Anon sign in error', err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    saveCachedAuthUser(null);
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Sign out notice', err);
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser && !currentUser.isAnonymous) {
      saveCachedAuthUser(currentUser);
      await syncUserProfile(currentUser).catch(() => {});
      purgeExpiredData(currentUser).catch(() => {});
    } else if (!currentUser) {
      saveCachedAuthUser(null);
    }
    callback(currentUser);
  });
}

// Save conversation (Firestore + localStorage mirror)
export async function saveConversation(conv: Conversation, user?: User | null): Promise<void> {
  // Always update localStorage mirror
  try {
    const local = getSavedConversationsFromLocal();
    const existingIdx = local.findIndex((c) => c.id === conv.id);
    if (existingIdx >= 0) {
      local[existingIdx] = conv;
    } else {
      local.unshift(conv);
    }
    localStorage.setItem('aether_conversations', JSON.stringify(local));
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }

  // If Firebase Firestore is active and user is logged in
  if (db && user) {
    const path = `conversations/${conv.id}`;
    const sanitizedMessages = sanitizeMessagesForFirestore(conv.messages || []);

    try {
      await setDoc(doc(db, 'conversations', conv.id), {
        id: conv.id,
        userId: user.uid,
        title: (conv.title || 'New Transmission').slice(0, 100),
        model: (conv.model || 'gemini-3.7-flash').slice(0, 64),
        reasoningLevel: conv.reasoningLevel || 'standard',
        createdAt: new Date(conv.createdAt || Date.now()).toISOString(),
        updatedAt: new Date(conv.updatedAt || Date.now()).toISOString(),
        messageCount: conv.messages ? conv.messages.length : 0,
        messages: sanitizedMessages,
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch {
        // Fallback to local storage
      }
    }
  }
}

// Load saved conversations
export async function loadConversations(user?: User | null): Promise<Conversation[]> {
  const localList = getSavedConversationsFromLocal();

  if (db && user && !user.isAnonymous) {
    const path = 'conversations';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const remoteList: Conversation[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        remoteList.push({
          id: data.id || d.id,
          title: data.title || 'Untitled Session',
          createdAt: new Date(data.createdAt || Date.now()).getTime(),
          updatedAt: new Date(data.updatedAt || Date.now()).getTime(),
          model: data.model || 'gemini-3.7-flash',
          reasoningLevel: data.reasoningLevel || 'standard',
          messages: data.messages || [],
        });
      });
      if (remoteList.length > 0) {
        // Update local cache
        localStorage.setItem('aether_conversations', JSON.stringify(remoteList));
        return remoteList;
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        return localList;
      }
    }
  }

  return localList;
}

// Delete conversation
export async function deleteSavedConversation(convId: string, user?: User | null): Promise<void> {
  try {
    const local = getSavedConversationsFromLocal();
    const updated = local.filter((c) => c.id !== convId);
    localStorage.setItem('aether_conversations', JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage remove failed', e);
  }

  if (db && user) {
    const path = `conversations/${convId}`;
    try {
      await deleteDoc(doc(db, 'conversations', convId));
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, path);
      } catch {
        // gracefully handled
      }
    }
  }
}

// 60-Day Data Retention Auto-Purge Engine
export async function purgeExpiredData(user?: User | null): Promise<{
  purgedCount: number;
  cutoffDate: Date;
}> {
  const cutoffTimestamp = Date.now() - RETENTION_PERIOD_MS;
  const cutoffDate = new Date(cutoffTimestamp);
  let purgedCount = 0;

  // 1. Purge from Local Storage
  try {
    const local = getSavedConversationsFromLocal();
    const fresh = local.filter((c) => {
      const time = c.updatedAt || c.createdAt || 0;
      return time >= cutoffTimestamp;
    });
    purgedCount += local.length - fresh.length;
    localStorage.setItem('aether_conversations', JSON.stringify(fresh));
  } catch (e) {
    console.warn('Local purge notice', e);
  }

  // 2. Purge from Firestore (if user is authenticated)
  if (db && user && !user.isAnonymous) {
    const path = 'conversations';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const deletePromises: Promise<void>[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const updatedAtTime = new Date(data.updatedAt || data.createdAt || 0).getTime();
        if (updatedAtTime < cutoffTimestamp) {
          purgedCount++;
          deletePromises.push(deleteDoc(doc(db, 'conversations', docSnap.id)));
        }
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.warn('Firestore 60-day lifecycle sweep warning:', error);
    }
  }

  return { purgedCount, cutoffDate };
}

// Submit Feedback to Firestore
export async function submitUserFeedback(feedback: FeedbackData): Promise<boolean> {
  // Save to local feedback store
  try {
    const existing = JSON.parse(localStorage.getItem('aether_feedback_submissions') || '[]');
    existing.push(feedback);
    localStorage.setItem('aether_feedback_submissions', JSON.stringify(existing));
  } catch (e) {
    console.warn('Local feedback save notice', e);
  }

  const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `feedbacks/${feedbackId}`;

  if (db) {
    try {
      await setDoc(doc(db, 'feedbacks', feedbackId), {
        category: feedback.category,
        rating: Number(feedback.rating) || 5,
        comment: (feedback.comment || '').slice(0, 2000),
        createdAt: feedback.createdAt || new Date().toISOString(),
        userId: feedback.userId || 'anonymous',
        userEmail: feedback.userEmail || '',
      });
      return true;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch {
        return true; // Fallback to local
      }
    }
  }
  return true;
}

export function getSavedConversationsFromLocal(): Conversation[] {
  try {
    const raw = localStorage.getItem('aether_conversations');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
