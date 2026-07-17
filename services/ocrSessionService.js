import { localRepository } from '../repositories/localRepository.js';

const OCR_SESSION_KEY = 'ALLHAS_OCR_SESSIONS';
const SESSION_EXPIRE_MS = 30 * 60 * 1000; // 30 minutes

export const ocrSessionService = {
  createSession(suggestions) {
    const sessions = this._getSessions();
    const sessionId = 'ocr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    sessions[sessionId] = {
      id: sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRE_MS,
      source: 'camera_label',
      suggestions: suggestions || {}
    };

    this._saveSessions(sessions);
    this.cleanExpiredSessions();
    return sessionId;
  },

  getSession(sessionId) {
    const sessions = this._getSessions();
    const session = sessions[sessionId];
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    return null;
  },

  consumeSession(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      const sessions = this._getSessions();
      delete sessions[sessionId];
      this._saveSessions(sessions);
    }
    return session;
  },

  cleanExpiredSessions() {
    const sessions = this._getSessions();
    const now = Date.now();
    let changed = false;
    for (const key in sessions) {
      if (sessions[key].expiresAt <= now) {
        delete sessions[key];
        changed = true;
      }
    }
    if (changed) {
      this._saveSessions(sessions);
    }
  },

  _getSessions() {
    const data = localRepository.get(OCR_SESSION_KEY);
    return data || {};
  },

  _saveSessions(sessions) {
    localRepository.set(OCR_SESSION_KEY, sessions);
  }
}
