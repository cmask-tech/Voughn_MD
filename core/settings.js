// core/settings.js
const database = require('./database');

class Settings {
    constructor() {
        this.settings = null;
    }
    
    async initialize() {
        this.settings = await database.getBotSettings();
        if (!this.settings) {
            console.log('⚠️ Using default settings. ');
            this.settings = {
                prefix: '.',
                mode: 'public',
                owner_phone: null,
                owner_jid: null
            };
        }
        return this.settings;
    }
    
    getPrefix() {
        return this.settings?.prefix || '.';
    }
    
    getMode() {
        return this.settings?.mode || 'public';
    }
    
    getOwnerJid() {
        return this.settings?.owner_jid;
    }
    
    async canUserUseCommand(userJid, command) {
        try {
            // Always allow if no owner is set yet (first-time setup)
            if (!this.getOwnerJid()) {
                return true;
            }
            
            const isOwner = await database.isOwner(userJid);
            const isSudo = await database.isSudo(userJid);
            
            console.log(`🔐 Permission Check for ${userJid}:`);
            console.log(`  - Is Owner: ${isOwner}`);
            console.log(`  - Is Sudo: ${isSudo}`);
            console.log(`  - Command Owner Only: ${command.ownerOnly}`);
            console.log(`  - Mode: ${this.getMode()}`);
            
            // Owner can use all commands
            if (isOwner) {
                console.log('✅ Owner access granted');
                return true;
            }
            
            // Check if command is owner-only
            if (command.ownerOnly) {
                console.log('❌ Owner-only command denied');
                return false;
            }
            
            // In private mode, only owner and sudo can use commands
            if (this.getMode() === 'private' && !isSudo) {
                console.log('❌ Private mode - non-sudo denied');
                return false;
            }
            
            // In public mode, anyone can use non-owner commands
            console.log('✅ Public mode access granted');
            return true;
            
        } catch (error) {
            console.error('❌ Permission check error:', error);
            return false;
        }
    }
}

module.exports = new Settings();