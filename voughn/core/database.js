// core/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('./utils');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/bot.db');
    }
    
    async initialize() {
        return new Promise((resolve, reject) => {
            const fs = require('fs');
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }
    
    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS bot_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prefix TEXT DEFAULT '.',
                mode TEXT DEFAULT 'public',
                owner_phone TEXT,
                owner_jid TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS sudo_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jid TEXT UNIQUE,
                phone TEXT,
                added_by TEXT,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS group_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_jid TEXT UNIQUE,
                antilink BOOLEAN DEFAULT 0,
                antistatusmention BOOLEAN DEFAULT 0,
                antidemote BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS deleted_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_jid TEXT,
                deleted_by TEXT,
                message_content TEXT,
                message_type TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS edited_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_jid TEXT,
                edited_by TEXT,
                original_content TEXT,
                edited_content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS user_trust (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_jid TEXT UNIQUE,
                trust_score INTEGER DEFAULT 100,
                is_blocked BOOLEAN DEFAULT 0,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        for (const tableSql of tables) {
            await this.runQuery(tableSql);
        }
        
        // FIXED: Check if settings exist properly
        const hasSettings = await this.runQuery("SELECT * FROM bot_settings LIMIT 1");
        //console.log('🔍 Checking for existing settings:', hasSettings);
        
        // hasSettings is an array, so check if array is empty
        if (!hasSettings || hasSettings.length === 0) {
            //console.log('📝 Creating default settings...');
            await this.runQuery(
                "INSERT INTO bot_settings (prefix, mode) VALUES (?, ?)",
                ['.', 'public']
            );
            //console.log('✅ Default settings created');
        } else {
            //console.log('✅ Using existing settings');
        }
        
        return true;
    }
    
    async runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Database query error:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    async getBotSettings() {
        try {
            const result = await this.runQuery("SELECT * FROM bot_settings WHERE id = 1");
            return result[0] || null;
        } catch (error) {
            console.error('Error getting bot settings:', error);
            return null;
        }
    }
    
    async updatePrefix(newPrefix) {
        await this.runQuery("UPDATE bot_settings SET prefix = ? WHERE id = 1", [newPrefix]);
    }
    
    async updateMode(newMode) {
        await this.runQuery("UPDATE bot_settings SET mode = ? WHERE id = 1", [newMode]);
    }
    
    async setOwner(jid, phone) {
        await this.runQuery(
            "UPDATE bot_settings SET owner_jid = ?, owner_phone = ? WHERE id = 1",
            [jid, phone]
        );
    }
    
    // In core/database.js, update the isOwner method:
    async isOwner(jid) {
        try {
            const settings = await this.getBotSettings();
            if (!settings || !jid) return false;
            
            // Normalize JIDs for comparison
            const normalizedJid = jid.replace(/:\d+@/, '@'); // Remove device ID
            const normalizedOwnerJid = settings.owner_jid?.replace(/:\d+@/, '@');
            
            console.log(`🔍 Owner Check: ${normalizedJid} === ${normalizedOwnerJid}`);
            return normalizedJid === normalizedOwnerJid;
        } catch (error) {
            console.error('Owner check error:', error);
            return false;
        }
    }
    async isSudo(jid) {
        try {
            const result = await this.runQuery("SELECT * FROM sudo_users WHERE jid = ?", [jid]);
            return result.length > 0;
        } catch (error) {
            return false;
        }
    }
    
    async addSudoUser(jid, phone, addedBy) {
        try {
            await this.runQuery(
                "INSERT OR IGNORE INTO sudo_users (jid, phone, added_by) VALUES (?, ?, ?)",
                [jid, phone, addedBy]
            );
            return true;
        } catch (error) {
            console.error('Error adding sudo user:', error);
            return false;
        }
    }
    
    async removeSudoUser(jid) {
        await this.runQuery("DELETE FROM sudo_users WHERE jid = ?", [jid]);
    }
    
    async hasExistingSettings() {
        try {
            const result = await this.runQuery("SELECT * FROM bot_settings LIMIT 1");
            return result.length > 0;
        } catch (error) {
            return false;
        }
    }
    
    // Add to your existing database.js

    // Log deleted messages
    async logDeletedMessage(originalJid, deletedBy, content, type) {
        try {
            await this.runQuery(
                "INSERT INTO deleted_messages (original_jid, deleted_by, message_content, message_type) VALUES (?, ?, ?, ?)",
                [originalJid, deletedBy, content, type]
            );
        } catch (error) {
            console.error('Error logging deleted message:', error);
        }
    }

    // Log edited messages  
    async logEditedMessage(originalJid, editedBy, originalContent, editedContent) {
        try {
            await this.runQuery(
                "INSERT INTO edited_messages (original_jid, edited_by, original_content, edited_content) VALUES (?, ?, ?, ?)",
                [originalJid, editedBy, originalContent, editedContent]
            );
        } catch (error) {
            console.error('Error logging edited message:', error);
        }
    }

    // Update user trust score
    async updateUserTrust(jid, scoreChange) {
        try {
            const current = await this.runQuery("SELECT * FROM user_trust WHERE user_jid = ?", [jid]);
            
            if (current.length === 0) {
                await this.runQuery(
                    "INSERT INTO user_trust (user_jid, trust_score) VALUES (?, ?)",
                    [jid, Math.max(0, 100 + scoreChange)]
                );
            } else {
                const newScore = Math.max(0, current[0].trust_score + scoreChange);
                await this.runQuery(
                    "UPDATE user_trust SET trust_score = ?, last_activity = CURRENT_TIMESTAMP WHERE user_jid = ?",
                    [newScore, jid]
                );
                
                // Auto-block if trust score too low
                if (newScore <= 20) {
                    await this.runQuery(
                        "UPDATE user_trust SET is_blocked = 1 WHERE user_jid = ?",
                        [jid]
                    );
                }
            }
        } catch (error) {
            console.error('Error updating user trust:', error);
        }
    }

    // Check if user is blocked
    async isUserBlocked(jid) {
        try {
            const result = await this.runQuery("SELECT is_blocked FROM user_trust WHERE user_jid = ?", [jid]);
            return result.length > 0 && result[0].is_blocked === 1;
        } catch (error) {
            return false;
        }
    }

    // Get group settings
    async getGroupSettings(groupJid) {
        try {
            const result = await this.runQuery("SELECT * FROM group_settings WHERE group_jid = ?", [groupJid]);
            return result[0] || null;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new Database();