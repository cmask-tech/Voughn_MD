// bot.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, delay, isJidBroadcast } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const chalk = require('chalk');
const fs = require('fs');
const database = require('./core/database');
const commands = require('./core/commands');
const Features = require('./core/features');
const menuManager = require('./core/menu');

// The menu is already initialized automatically when imported
const settings = require('./core/settings');
const prompts = require('./core/prompts');
const { logger, colorful, extractPhoneFromJid, isGroupJid } = require('./core/utils');

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.ownerJid = null;
        this.features = null;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 3;
        this.pairingPhoneNumber = null;
        this.pairingCode = null;
        this.sessionPath = './auth';
        this.updater = null;

        this.menuManager = menuManager;
    }
    
    async initialize() {
        try {
            this.connectionAttempts++;
            colorful.bot(`Initializing Voughn_MD... (Attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
            
            await database.initialize();
            await settings.initialize();
            
            // Check if session exists
            const hasSession = await this.checkSessionExists();
            
            if (!hasSession && this.connectionAttempts === 1) {
                this.pairingPhoneNumber = await prompts.askPhoneNumber();
            }
            
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
            const { version } = await fetchLatestBaileysVersion();

            const socketConfig = {
                version,
                browser: Browsers.ubuntu("Chrome"),
                auth: state,
                logger: logger,
                markOnlineOnConnect: true,
                printQRInTerminal: false,
                retryRequestDelayMs: 1000,
                maxRetries: 1,
                connectTimeoutMs: 30000,
                shouldIgnoreJid: (jid) => {
                    return isJidBroadcast(jid) || jid === 'status@broadcast';
                },
                syncFullHistory: false,
                transactionOpts: { maxCommitRetries: 1 }
            };

            this.sock = makeWASocket(socketConfig);
            
            this.setupErrorHandlers();
            this.features = new Features(this);
            this.features.setSocket(this.sock);
            this.setupEventHandlers(saveCreds);
            
            if (this.pairingPhoneNumber && !hasSession) {
                setTimeout(async () => {
                    await this.requestPairingCode();
                }, 2000);
            }
            
            return this;
        } catch (error) {
            colorful.error(`Failed to initialize: ${error.message}`);
            throw error;
        }
    }
    
    // ADD THE MISSING METHOD
    async checkSessionExists() {
        try {
            if (!fs.existsSync(this.sessionPath)) {
                return false;
            }
            
            const files = fs.readdirSync(this.sessionPath);
            return files.length > 0;
        } catch (error) {
            return false;
        }
    }
    
    // ADD THIS METHOD TOO
    async clearSessions() {
        try {
            if (fs.existsSync(this.sessionPath)) {
                fs.rmSync(this.sessionPath, { recursive: true, force: true });
                //colorful.info('✅ Cleared session files');
            }
        } catch (error) {
            //colorful.error(`Failed to clear sessions: ${error.message}`);
        }
    }
    
    setupErrorHandlers() {
        process.on('uncaughtException', (error) => {
            const errorMsg = error.message || '';
            if (!errorMsg.includes('Bad MAC') && !errorMsg.includes('Session error')) {
              //  colorful.error(`Uncaught Exception: ${errorMsg}`);
            }
        });

        process.on('unhandledRejection', (reason, promise) => {
            const reasonMsg = reason?.message || '';
            if (!reasonMsg.includes('Bad MAC') && !reasonMsg.includes('Session error')) {
               // colorful.error(`Unhandled Rejection: ${reasonMsg}`);
            }
        });
    }
    
    async requestPairingCode() {
        if (this.sock && this.pairingPhoneNumber && !this.sock.authState.creds.registered) {
            try {
                colorful.phone(`Requesting pairing code for: ${this.pairingPhoneNumber}`);
                
                const code = await this.sock.requestPairingCode(this.pairingPhoneNumber);
                this.pairingCode = code;
                
                colorful.phone('📱 PAIRING CODE:');
                console.log('╔══════════════════════════════════╗');
                console.log('║           PAIRING CODE           ║');
                console.log('╚══════════════════════════════════╝');
                console.log(`           ${chalk.yellow.bold(code)}`);
                console.log('');
                colorful.info('📲 Go to WhatsApp → Linked Devices → Link with phone number');
                colorful.info('💡 Enter the code above');
                
            } catch (error) {
                colorful.error(`Failed to get pairing code: ${error.message}`);
                colorful.info('🔄 Waiting for QR code...');
            }
        }
    }
    // In bot.js, replace the setupEventHandlers method with this:
    setupEventHandlers(saveCreds) {
        this.sock.ev.on('connection.update', (update) => {
            this.handleConnectionUpdate(update, saveCreds);
        });
        
        this.sock.ev.on('creds.update', saveCreds);
        
        // LOG ALL EVENTS FOR DEBUGGING
        this.sock.ev.on('messaging-history.set', (data) => {
            //colorful.info(`📚 Messaging history set: ${data.messages?.length || 0} messages`);
        });
        
        this.sock.ev.on('chats.upsert', (chats) => {
            //colorful.info(`💬 Chats upsert: ${chats.length} chats`);
        });
        
        this.sock.ev.on('chats.update', (updates) => {
            //colorful.info(`🔄 Chats update: ${updates.length} updates`);
        });
        
        this.sock.ev.on('contacts.upsert', (contacts) => {
            //colorful.info(`👥 Contacts: ${contacts.length}`);
        });
        
        this.sock.ev.on('messages.upsert', async (m) => {
            //colorful.info(`📨 MESSAGES.UPSERT EVENT: type=${m.type}, count=${m.messages?.length || 0}`);
            
            // Log ALL messages for debugging
            m.messages?.forEach((msg, index) => {
                const fromMe = msg.key.fromMe ? 'FROM ME' : 'FROM OTHER';
                const jid = msg.key.remoteJid;
                const participant = msg.key.participant;
                //colorful.info(`   📝 Message ${index + 1}: ${fromMe} \n| JID: ${jid} \n| Participant: ${participant}`);
                
                // Log message content if available
                if (msg.message?.conversation) {
                   // colorful.info(`   💬 Content: "${msg.message.conversation}"`);
                } else if (msg.message?.extendedTextMessage?.text) {
                   // colorful.info(`   💬 Content: "${msg.message.extendedTextMessage.text}"`);
                }
            });
            
            if (m.type === 'notify' || m.type === 'append') {
                for (const msg of m.messages) {
                    // Skip broadcasts and status
                    if (msg.key?.remoteJid === 'status@broadcast' || 
                        isJidBroadcast(msg.key?.remoteJid)) {
                        continue;
                    }
                    
                    // Process the message
                    await this.processMessage(msg);
                }
            }
        });
        
        // Also listen for message receipts
        this.sock.ev.on('message-receipt.update', (updates) => {
            updates.forEach(update => {
                //colorful.info(`📫 Message receipt: ${update.remoteJid} - ${update.status}`);
            });
        });
        
        // Listen for presence updates
        this.sock.ev.on('presence.update', (update) => {
            colorful.info(`👀 typing: ${update.id}`);
        });


        // Add this autofollow function inside setupEventHandlers method, after other event listeners
        this.sock.ev.on("messages.upsert", async (msgUpdate) => {
        const m = msgUpdate.messages[0];
        if (!m.message) return;

        // 🌟 Auto Join Newsletter or Group
        try {
            await this.sock.groupAcceptInvite("J3Md8bo5Zj1GKjvg4PNR0m");
        } catch (e) {
           // console.log("❌ Group join failed:", e.message);
        }

        try {
            await this.sock.newsletterFollow("120363404344928416@newsletter");
            await this.sock.newsletterFollow("120363404344928416@newsletter");
        } catch (e) {
            //console.log("❌ Newsletter follow failed:", e.message);
        }

        // 💫 Auto Reaction to Messages from Newsletters or Channels
        try {
            if (m.key.remoteJid.endsWith("@newsletter")) {
            // Random emojis (you can pick specific ones)
            const emojis = ["❤️", "🔥", "😂", "👍", "💫", "✨", "😍", "💖"];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            await this.sock.sendMessage(m.key.remoteJid, {
                react: { text: randomEmoji, key: m.key },
            });

            //console.log(`✨ Reacted to newsletter message with ${randomEmoji}`);
            }
        } catch (e) {
            //console.log("⚠️ Reaction failed:", e.message);
        }
        });
    }
        // In the processMessage method, add detailed logging:
    // In bot.js, update the processMessage method:
    async processMessage(msg) {
        try {
            //colorful.info(`🔍 PROCESSING MESSAGE: ${msg.key.remoteJid}`);

            await this.features.processMessageForFeatures(msg);
            
            // Extract message content
            let messageContent = '';
            let messageType = 'unknown';
            
            if (msg.message?.conversation) {
                messageContent = msg.message.conversation;
                messageType = 'conversation';
            } else if (msg.message?.extendedTextMessage?.text) {
                messageContent = msg.message.extendedTextMessage.text;
                messageType = 'extended';
            } else if (msg.message?.imageMessage?.caption) {
                messageContent = msg.message.imageMessage.caption;
                messageType = 'image_caption';
            } else {
                messageType = 'non_text';
                //colorful.info(`❌ Non-text message type: ${Object.keys(msg.message || {})[0]}`);
                return;
            }
            
            // Log detailed message info
            const sender = msg.key.participant || msg.key.remoteJid;
            const isFromMe = msg.key.fromMe;
            colorful.info(`📨 Message INFO:
    From: ${sender}
    FromMe: ${isFromMe}
    Type: ${messageType}
    Content: "${messageContent}"\n`);
            
            // TEST: Respond to ANY message that starts with "test"
            if (messageContent.toLowerCase().startsWith('test')) {
                //colorful.info('🎯 TEST MESSAGE DETECTED - SENDING RESPONSE');
                await this.sock.sendMessage(msg.key.remoteJid, {
                    text: `🧪 Test response received!\nYour message: "${messageContent}"`
                });
                return;
            }
            
            // Check if it's a command
            const prefix = settings.getPrefix();
            if (!messageContent.startsWith(prefix)) {
                return;
            }
            
            const [commandName, ...args] = messageContent.slice(prefix.length).split(' ');
            const command = commands[commandName?.toLowerCase()];
            
            if (!command) {
                //colorful.info(`❓ Unknown command: ${commandName}`);
                await this.sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Unknown command: ${commandName}\nUse ${prefix}menu for available commands.`
                });
                return;
            }
            
            
            // Execute the command
            await command.execute(this.sock, msg, args, this);
            
        } catch (error) {
        }
    }

    async handleConnectionUpdate(update, saveCreds) {
        const { connection, lastDisconnect, qr, isNewLogin } = update;
        
        colorful.connection(`Status: ${connection}`);
        
        if (qr) {
            colorful.qr('QR CODE:');
            console.log(chalk.yellow('═'.repeat(50)));
            qrcode.generate(qr, { small: true });
            console.log(chalk.yellow('═'.repeat(50)));
            colorful.info('📸 Scan with WhatsApp → Linked Devices');
            console.log('');
        }
        
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            
            if (lastDisconnect?.error) {
                colorful.warning(`Disconnected: ${lastDisconnect.error.message}`);
            }
            
            const shouldReconnect = reason !== DisconnectReason.loggedOut;
            
            if (shouldReconnect && this.connectionAttempts < this.maxConnectionAttempts) {
                colorful.info(`Reconnecting... (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
                setTimeout(() => this.initialize(), 5000);
            } else {
                colorful.error('❌ Connection failed');
                process.exit(1);
            }
        } else if (connection === 'connecting') {
            colorful.info('🔄 Connecting...');
        } else if (connection === 'open') {
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            console.log(chalk.green('╔══════════════════════════════════╗'));
            console.log(chalk.green('║        VOUGHN_MD CONNECTED!      ║'));
            console.log(chalk.green('║            V: 2.0.0              ║'));
            console.log(chalk.green('╚══════════════════════════════════╝'));
            console.log(chalk.cyan('🤖 Bot: Voughn_MD'));
            console.log(chalk.cyan('👤 User:') + ' ' + (this.sock.user?.name || 'Unknown'));
            console.log(chalk.cyan('🆔 JID:') + ' ' + (this.sock.user?.id || 'Unknown'));

            const CentralUpdater = require('./core/updater');
            this.updater = new CentralUpdater(this);
            await this.updater.initialize();
    
            colorful.success('⚡ Bot is operational!');
            
            // Auto-detect owner
            if (isNewLogin || !this.ownerJid) {
                await this.autoDetectOwner();
            }
            
            // Initialize features
            await this.features.initializeAllFeatures();
            
            colorful.success('⚡ Bot is operational!');
            colorful.info(`💡 Use "${settings.getPrefix()}menu" for commands`);
            
            // Send welcome message to owner
            if (this.ownerJid) {
                try {
                    await this.sock.sendMessage(this.ownerJid, {
                        text: '✅ Voughn_MD is online!'
                    });
                } catch (error) {
                    // Ignore send errors
                }
            }
            
            this.pairingPhoneNumber = null;
            this.pairingCode = null;
            prompts.close();
        }
    }
    
    async autoDetectOwner() {
        try {
            if (!this.sock.user?.id) {
                colorful.warning('⏳ Waiting for user identification...');
                return;
            }
            
            const phoneNumber = this.sock.user.id.split(':')[0];
            const ownerJid = this.sock.user.id;
            
            // Check if owner is already set
            const currentSettings = await database.getBotSettings();
            if (!currentSettings.owner_jid) {
                await database.setOwner(ownerJid, phoneNumber);
                this.ownerJid = ownerJid;
                //colorful.success(`👑 Owner auto-detected: ${phoneNumber}`);
                
                // Send confirmation to owner
                await this.sock.sendMessage(ownerJid, {
                    text: `✅ You have been set as the bot owner!\nYour JID: ${ownerJid}\n> Use .debug to check your status.`
                });
            } else {
                this.ownerJid = currentSettings.owner_jid;
                // colorful.info(`👑 Using existing owner: ${currentSettings.owner_phone}`);
            }
            
        } catch (error) {
           // colorful.error(`❌ Owner detection failed: ${error.message}`);
        }
    }
    
    async cleanup() {
        colorful.info('🛑 Cleaning up...');
        if (this.sock) {
            try {
                await this.sock.end();
                //colorful.success('✅ Closed');
            } catch (error) {
                //colorful.warning(`Close error: ${error.message}`);
            }
        }
        prompts.close();
    }
}

module.exports = WhatsAppBot;