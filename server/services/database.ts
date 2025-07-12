import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import type { Database } from 'sqlite';
import { join } from 'path';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: string; // JSON string for additional data
}

export class DatabaseService {
  private static db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  static async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: join(process.cwd(), 'data', 'claude-chat.db'),
        driver: sqlite3.Database
      });

      await this.createTables();
      await this.createDefaultUser();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create users table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create messages table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);
  }

  private static async createDefaultUser(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existingUser = await this.db.get('SELECT id FROM users WHERE username = ?', ['admin']);
    
    if (!existingUser) {
      const defaultPassword = process.env.DEFAULT_PASSWORD || 'claudechat2025';
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      
      await this.db.run(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        ['admin', passwordHash]
      );
      
      console.log('Default user created with username: admin');
      if (!process.env.DEFAULT_PASSWORD) {
        console.log('Default password: claudechat2025');
        console.log('Please change this password in production!');
      }
    }
  }

  // User methods
  static async getUserByUsername(username: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const user = await this.db.get<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    return user || null;
  }

  static async validatePassword(username: string, password: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    if (!user) return false;
    
    return bcrypt.compare(password, user.password_hash);
  }

  // Session methods
  static async createSession(userId: number, title: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.run(
      'INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)',
      [sessionId, userId, title]
    );
    
    return sessionId;
  }

  static async getSessionsByUserId(userId: number): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const sessions = await this.db.all<Session[]>(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    
    return sessions;
  }

  static async getSession(sessionId: string): Promise<Session | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const session = await this.db.get<Session>(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId]
    );
    
    return session || null;
  }

  static async updateSessionTimestamp(sessionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(
      'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );
  }

  static async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
  }

  // Message methods
  static async saveMessage(
    sessionId: string, 
    role: 'user' | 'assistant' | 'system', 
    content: string, 
    metadata?: any
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.run(
      'INSERT INTO messages (session_id, role, content, metadata) VALUES (?, ?, ?, ?)',
      [sessionId, role, content, metadata ? JSON.stringify(metadata) : null]
    );
    
    // Update session timestamp
    await this.updateSessionTimestamp(sessionId);
    
    return result.lastID!;
  }

  static async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const messages = await this.db.all<Message[]>(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    );
    
    return messages;
  }

  static async deleteMessage(messageId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run('DELETE FROM messages WHERE id = ?', [messageId]);
  }

  // Utility methods
  static async getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  static async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}