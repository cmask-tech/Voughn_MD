// core/features.js
const database = require('./database');
const { colorful, extractPhoneFromJid, isGroupJid } = require('./utils');

class Features {
    constructor(bot) {
        this.bot = bot;
        this.sock = null;
        this.deletedMessages = new Map();
        this.editedMessages = new Map();
        this.userActivity = new Map();
        this.deletedStatus = new Map();
        this.spamDetection = new Map();
        this.typingTimeouts = new Map();
        this.recordingTimeouts = new Map();
        this.viewOnceMessages = new Map();
        this.savedMediaPath = './saved-media';
        this.chatbotEnabled = false;
        this.chatbotHelper = null;
        
        // Feature states - all disabled by default
        this.featureStates = {
            antidelete: false,
            antiedit: false,
            autoview: false,
            autoreact: false,
            autotyping: false,
            autorecording: false,
            autoread: false,
            anticall: false,
            antideletestatus: false,
            antispam: false,
            autoreactmsg: false
        };
    }

    setSocket(sock) {
        this.sock = sock;
    }

    // ==================== ANTI-DELETE FEATURE ====================
    async setupAntiDelete() {
        this.sock.ev.on('messages.delete', async (deleteData) => {
            if (!this.featureStates.antidelete || !deleteData.keys || !this.bot.ownerJid) return;
            
            for (const key of deleteData.keys) {
                try {
                    //retrieve from cahe
                    const deletedMessage = this.deletedMessages.get(key.id) || 
                                         await this.findRecentMessage(key);
                    
                    if (deletedMessage) {
                        const content = this.extractMessageContent(deletedMessage);
                        const deleter = key.participant || 'Unknown';
                        
                        // Log to database
                        await database.logDeletedMessage(
                            key.remoteJid, 
                            deleter, 
                            content, 
                            deletedMessage.message ? Object.keys(deletedMessage.message)[0] : 'text'
                        );

                        // Send mesej tu owner
                        const deleteInfo = `
🚨 *MESSAGE DELETED* 🚨
━━━━━━━━━━━━━━━━━━━━
👤 *Deleted By:* ${deleter}
💬 *Content:* ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}
📱 *Chat:* ${key.remoteJid}
⏰ *Time:* ${new Date().toLocaleString()}
                        `.trim();

                        await this.sock.sendMessage(this.bot.ownerJid, { text: deleteInfo });
                        
                        // Also notify in group if enabled
                        if (isGroupJid(key.remoteJid)) {
                            const groupSettings = await database.getGroupSettings(key.remoteJid);
                            if (groupSettings?.antidelete) {
                                await this.sock.sendMessage(key.remoteJid, {
                                    text: `⚠️ @${deleter.split('@')[0]} deleted a message!`,
                                    mentions: [deleter]
                                });
                            }
                        }
                    }
                } catch (error) {
                    colorful.error(`Anti-delete error: ${error.message}`);
                }
            }
        });
    }

    // ==================== ANTI-EDIT FEATURE ====================
    async setupAntiEdit() {
        this.sock.ev.on('messages.update', async (updates) => {
            if (!this.featureStates.antiedit) return;
            
            for (const update of updates) {
                if (update.update?.message?.protocolMessage?.editedMessage && this.bot.ownerJid) {
                    try {
                        const originalMessage = this.editedMessages.get(update.key.id);
                        const editedMessage = update.update.message.protocolMessage.editedMessage;
                        
                        if (originalMessage) {
                            const originalContent = this.extractMessageContent(originalMessage);
                            const editedContent = this.extractMessageContent({ message: editedMessage });
                            const editor = update.key.participant || 'Unknown';

                            // Log to database
                            await database.logEditedMessage(
                                update.key.remoteJid,
                                editor,
                                originalContent,
                                editedContent
                            );

                            // Send msg to owner
                            const editInfo = `
🚨 *MESSAGE EDITED* 🚨
━━━━━━━━━━━━━━━━━━━━
👤 *Edited By:* ${editor}
📜 *Original:* ${originalContent.substring(0, 150)}${originalContent.length > 150 ? '...' : ''}
📝 *Edited:* ${editedContent.substring(0, 150)}${editedContent.length > 150 ? '...' : ''}
📱 *Chat:* ${update.key.remoteJid}
⏰ *Time:* ${new Date().toLocaleString()}
                            `.trim();

                            await this.sock.sendMessage(this.bot.ownerJid, { text: editInfo });
                        }
                    } catch (error) {
                        colorful.error(`Anti-edit error: ${error.message}`);
                    }
                }
            }
        });
    }

    // ==================== AUTO-VIEW STATUS ====================
    async setupAutoViewStatus() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoview || m.type !== 'notify') return;
            
            for (const msg of m.messages) {
                // Auto-view status updates
                if (msg.key.remoteJid === 'status@broadcast') {
                    try {
                        await this.sock.readMessages([msg.key]);
                       // colorful.info(`👀 Auto-viewed status update`);
                        

                        const statusContent = this.extractMessageContent(msg);
                        if (statusContent && statusContent !== 'Unsupported message type') {
                            this.deletedStatus.set(msg.key.id, statusContent);
                        }
                    } catch (error) {
                        // Silent fail for cmd nn
                    }
                }
            }
        });
    }

    // ==================== AUTO-REACT STATUS ====================
    async setupAutoReactStatus() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoreact || m.type !== 'notify') return;
            
            for (const msg of m.messages) {
                if (msg.key.remoteJid === 'status@broadcast') {
                    try {
                        // Auto-react with emoji
                        const reactions = ['👍', '❤️', '🔥', '😂', '😮', '😢'];
                        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                        
                        await this.sock.sendMessage(msg.key.remoteJid, {
                            react: {
                                text: randomReaction,
                                key: msg.key
                            }
                        });
                        colorful.info(`🎭 Auto-reacted to status: ${randomReaction}`);
                    } catch (error) {
                        // Silent fail
                    }
                }
            }
        });
    }

    // ==================== AUTO-TYPING INDICATOR ====================
    async setupAutoTyping() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autotyping || m.type !== 'notify') return;
            
            for (const msg of m.messages) {
                // Auto-typing in response to messages
                if (!msg.key.fromMe && msg.message) {
                    try {
                        const jid = msg.key.remoteJid;
                        
                        if (this.typingTimeouts.has(jid)) {
                            clearTimeout(this.typingTimeouts.get(jid));
                        }
                        
                        await this.sock.sendPresenceUpdate('composing', jid);
                        
                        // Stop typing after 7-9 seconds 
                        const timeout = setTimeout(async () => {
                            await this.sock.sendPresenceUpdate('paused', jid);
                            this.typingTimeouts.delete(jid);
                        }, 7000 + Math.random() * 9000);
                        
                        this.typingTimeouts.set(jid, timeout);
                        
                    } catch (error) {
                        // Silent fail
                    }
                }
            }
        });
    }

    // ==================== AUTO-RECORDING INDICATOR ====================
    async setupAutoRecording() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autorecording || m.type !== 'notify') return;
            
            for (const msg of m.messages) {
                // Auto-recording for messages
                if (!msg.key.fromMe && msg.message) {
                    try {
                        const jid = msg.key.remoteJid;
                        
                        // Clear existing timeout
                        if (this.recordingTimeouts.has(jid)) {
                            clearTimeout(this.recordingTimeouts.get(jid));
                        }
                        
                        await this.sock.sendPresenceUpdate('recording', jid);
                        
                        const timeout = setTimeout(async () => {
                            await this.sock.sendPresenceUpdate('paused', jid);
                            this.recordingTimeouts.delete(jid);
                        }, 8000);
                        
                        this.recordingTimeouts.set(jid, timeout);
                        
                        colorful.info(`🎙️ Auto-recording indicator shown`);
                    } catch (error) {
                        // Silent fail
                    }
                }
            }
        });
    }

    // ==================== AUTO-READ MESSAGES ====================
    async setupAutoRead() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoread || !m.messages) return;
            
            for (const msg of m.messages) {
                try {
                    await this.sock.readMessages([msg.key]);
                    //colorful.info(`📖 Auto-read message from ${msg.key.remoteJid}`);
                } catch (error) {
                    // Silent fail
                }
            }
        });
    }

    // ==================== ANTI-CALL FEATURE ====================
    async setupAntiCall() {
        this.sock.ev.on('call', async (call) => {
            if (!this.featureStates.anticall) return;
            
            try {
                await this.sock.rejectCall(call.id, call.from);
                colorful.info(`📞 Auto-declined call from: ${call.from}`);
                
                // Notify owner
                if (this.bot.ownerJid) {
                    await this.sock.sendMessage(this.bot.ownerJid, {
                        text: `📞 *CALL DECLINED*\n\n👤 From: ${call.from}\n⏰ Time: ${new Date().toLocaleString()}`
                    });
                }
            } catch (error) {
                colorful.error(`Anti-call error: ${error.message}`);
            }
        });
    }

    // ==================== ANTI-DELETE STATUS ====================
    async setupAntiDeleteStatus() {
        this.sock.ev.on('messages.delete', async (deleteData) => {
            if (!this.featureStates.antideletestatus || !this.bot.ownerJid || !deleteData.keys) return;
            
            for (const item of deleteData.keys) {
                if (item.remoteJid === 'status@broadcast') {
                    const deletedStatus = this.deletedStatus.get(item.id);
                    if (deletedStatus) {
                        try {
                            await this.sock.sendMessage(this.bot.ownerJid, {
                                text: `🗑️ *DELETED STATUS*\n\n💬 Content: ${deletedStatus}\n⏰ Time: ${new Date().toLocaleString()}`
                            });
                           // colorful.info(`📊 Sent deleted status to owner`);
                        } catch (error) {
                            colorful.error(`Anti-delete status error: ${error.message}`);
                        }
                    }
                }
            }
        });
    }

    // ==================== ANTI-SPAM FEATURE ====================
    async setupAntiSpam() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.antispam || !m.messages) return;
            
            for (const msg of m.messages) {
                if (!msg.key.fromMe) {
                    await this.detectAndHandleSpam(msg);
                }
            }
        });
    }

    async detectAndHandleSpam(message) {
        const userJid = message.key.participant || message.key.remoteJid;
        const now = Date.now();
        
        // Initialize user spam data
        if (!this.spamDetection.has(userJid)) {
            this.spamDetection.set(userJid, { count: 0, lastMessage: now, warned: false });
        }
        
        const userData = this.spamDetection.get(userJid);
        const timeDiff = now - userData.lastMessage;
        
        // Reset count if more than 10 seconds passed
        if (timeDiff > 10000) {
            userData.count = 0;
            userData.warned = false;
        }
        
        // Increment message count
        userData.count++;
        userData.lastMessage = now;
        
        // Check for spam patterns
        const isSpam = this.isSpamMessage(message, userData);
        
        if (isSpam) {
            colorful.warning(`🚫 Spam detected from ${userJid} (${userData.count} messages)`);
            
            if (userData.count >= 5 && !userData.warned) {
                // Send warning
                try {
                    await this.sock.sendMessage(message.key.remoteJid, {
                        text: `⚠️ *SPAM DETECTED*\nPlease slow down your messages!`
                    });
                    userData.warned = true;
                } catch (error) {
                    // Silent fail
                }
            }
            
            if (userData.count >= 10) {
                // Auto-block or take action
                try {
                    await this.sock.updateBlockStatus(userJid, 'block');
                    colorful.info(`🚫 Auto-blocked spammer: ${userJid}`);
                    
                    if (this.bot.ownerJid) {
                        await this.sock.sendMessage(this.bot.ownerJid, {
                            text: `🚫 *AUTO-BLOCKED SPAMMER*\n\n👤 User: ${userJid}\n📊 Messages: ${userData.count}\n🛡️ Reason: Spam detection`
                        });
                    }
                } catch (error) {
                    colorful.error(`Failed to block spammer: ${error.message}`);
                }
            }
        }
    }

    isSpamMessage(message, userData) {
        const content = this.extractMessageContent(message);
        
        // Spam detection criteria
        const spamCriteria = [
            userData.count > 3 && (Date.now() - userData.lastMessage) < 3000, // Too many messages too fast
            content.length > 500, // Very long message
            /http.*http.*http/i.test(content), // Multiple URLs
            /[A-Z]{10,}/.test(content), // Excessive caps
            /(.)\1{10,}/.test(content), // Repeated characters
            /(.)\1{5,}/.test(content) && content.length < 20 // Short repeated messages
        ];
        
        return spamCriteria.some(criterion => criterion === true);
    }

    // ==================== AUTO-REACT TO MESSAGES ====================
    async setupAutoReactMessages() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoreactmsg || !m.messages) return;
            
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    try {
                        const reactions = ['❤️', '👍', '🔥', '😂', '😮', '😢', '👏', '🎉'];
                        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                        
                        await this.sock.sendMessage(msg.key.remoteJid, {
                            react: {
                                text: randomReaction,
                                key: msg.key
                            }
                        });
                        colorful.info(`😊 Auto-reacted to message: ${randomReaction}`);
                    } catch (error) {
                        // Silent fail
                    }
                }
            }
        });
    }

    // ==================== ANTI-BUG FEATURE ====================
    async setupAntiBug() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe) {
                        const isSuspicious = this.detectSuspiciousMessage(msg);
                        const userJid = msg.key.participant || msg.key.remoteJid;
                        
                        if (isSuspicious) {
                            colorful.warning(`🚨 Suspicious message detected from ${userJid}`);
                            
                            // Decrease trust score
                            await database.updateUserTrust(userJid, -15);
                            
                            // Check if should block
                            const isBlocked = await database.isUserBlocked(userJid);
                            if (isBlocked) {
                                try {
                                    await this.sock.updateBlockStatus(userJid, 'block');
                                    colorful.info(`🚫 Auto-blocked suspicious user: ${userJid}`);
                                    
                                    // Notify owner
                                    await this.sock.sendMessage(this.bot.ownerJid, {
                                        text: `🚨 *AUTO-BLOCKED SUSPICIOUS USER*\n\n👤 User: ${userJid}\n🛡️ Reason: Suspicious activity detected`
                                    });
                                } catch (error) {
                                    colorful.error(`Failed to block user: ${error.message}`);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // ==================== AUTO-BLOCK FEATURE ====================
    async setupAutoBlock() {
        // This is handled in anti-bug feature
        colorful.info('🔒 Auto-block integrated with anti-bug system');
    }

    // ==================== ANTI-DEMOTE PROTECTION ====================
    async setupAntiDemote() {
        this.sock.ev.on('group-participants.update', async (update) => {
            // Check if bot is being demoted
            if (update.action === 'demote' && update.participants.includes(this.sock.user.id)) {
                try {
                    colorful.warning(`🛡️ Bot demotion detected in ${update.id}`);
                    
                    // Notify owner
                    await this.sock.sendMessage(this.bot.ownerJid, {
                        text: `⚠️ *BOT DEMOTED*\n\n🏷️ Group: ${update.id}\n🔧 Action: Bot was demoted from admin`
                    });

                    // Auto-leave group if enabled
                    const groupSettings = await database.getGroupSettings(update.id);
                    if (groupSettings?.antidemote) {
                        await this.sock.groupLeave(update.id);
                        colorful.info(`🚪 Auto-left group after demotion: ${update.id}`);
                    }
                    
                } catch (error) {
                    colorful.error(`Anti-demote error: ${error.message}`);
                }
            }
        });
    }

    // ==================== MESSAGE CACHING ====================
    async cacheMessage(message) {
        if (message.key?.id) {
            this.deletedMessages.set(message.key.id, message);
            this.editedMessages.set(message.key.id, message);
            
            // Limit cache size to 1000 messages
            if (this.deletedMessages.size > 1000) {
                const firstKey = this.deletedMessages.keys().next().value;
                this.deletedMessages.delete(firstKey);
            }
            if (this.editedMessages.size > 1000) {
                const firstKey = this.editedMessages.keys().next().value;
                this.editedMessages.delete(firstKey);
            }
        }
    }



// ==================== CHATBOT FEATURE ====================
async setupChatbot() {
    this.sock.ev.on('messages.upsert', async (m) => {
        if (!this.chatbotEnabled || m.type !== 'notify') return;
        
        for (const msg of m.messages) {
            await this.handleChatbotMessage(msg);
        }
    });
}

async handleChatbotMessage(message) {
    try {
        // Skip if message is from bot itself
        if (message.key.fromMe) return;
        
        // Skip commands (messages starting with prefix)
        const prefix = this.bot.settings?.getPrefix?.() || '.';
        const messageContent = this.extractMessageContent(message);
        
        if (!messageContent || messageContent.startsWith(prefix)) {
            return;
        }

        // Skip empty messages or system messages
        if (messageContent === 'Unsupported message type' || !messageContent.trim()) {
            return;
        }

        // Don't respond to group messages if not mentioned
        if (this.isGroupJid(message.key.remoteJid)) {
            const isMentioned = this.isBotMentioned(message);
            if (!isMentioned) return;
        }

        // Show typing indicator
        await this.sock.sendPresenceUpdate('composing', message.key.remoteJid);

        // Get AI response with timeout
        const response = await this.getChatbotResponse(messageContent, message);
        
        // Send response
        if (response) {
            await this.sock.sendMessage(message.key.remoteJid, { text: response });
        }

    } catch (error) {
        colorful.error(`Chatbot error: ${error.message}`);
        // Don't send error message to user to avoid spam
    }
}

async getChatbotResponse(messageContent, message) {
    try {
        if (!this.chatbotHelper) {
            this.chatbotHelper = require('./helpers/chatbot');
        }

        const userId = message.key.participant || message.key.remoteJid;
        const language = 'auto';
        
        // Add timeout to prevent hanging
        const response = await Promise.race([
            this.chatbotHelper.chat(messageContent, userId, language),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Response timeout')), 15000)
            )
        ]);
        
        return response;

    } catch (error) {
        colorful.error(`Chatbot response error: ${error.message}`);
        
        // Return a friendly fallback message
        const fallbacks ="🎯 Having some technical difficulties. Let's try that again!";
        
        return fallbacks;
    }
}

isBotMentioned(message) {
    if (!message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        return false;
    }
    
    const mentionedJids = message.message.extendedTextMessage.contextInfo.mentionedJid;
    const botJid = this.sock.user?.id;
    
    return mentionedJids.includes(botJid);
}

isGroupJid(jid) {
    return jid.endsWith('@g.us');
}

enableChatbot() {
    this.chatbotEnabled = true;
    colorful.info('🤖 Chatbot enabled - will reply to all messages');
    
    // Auto-disable after 6 hours to prevent accidental always-on
    setTimeout(() => {
        if (this.chatbotEnabled) {
            this.chatbotEnabled = false;
            colorful.info('🤖 Chatbot auto-disabled after 6 hours');
            
            // Notify owner
            if (this.bot.ownerJid) {
                this.sock.sendMessage(this.bot.ownerJid, {
                    text: '🤖 Chatbot has been automatically disabled.'
                }).catch(() => {});
            }
        }
    }, 1 * 60 * 60 * 1000); // 1 hour
}

disableChatbot() {
    this.chatbotEnabled = false;
    colorful.info('🤖 Chatbot disabled');
}

toggleChatbot() {
    this.chatbotEnabled = !this.chatbotEnabled;
    colorful.info(`🤖 Chatbot ${this.chatbotEnabled ? 'enabled' : 'disabled'}`);
    return this.chatbotEnabled;
}

getChatbotStatus() {
    return this.chatbotEnabled;
}



    // ==================== HELPER METHODS ====================
    extractMessageContent(message) {
        if (!message.message) return 'Unsupported message type';
        
        const messageType = Object.keys(message.message)[0];
        switch (messageType) {
            case 'conversation':
                return message.message.conversation;
            case 'extendedTextMessage':
                return message.message.extendedTextMessage.text;
            case 'imageMessage':
                return '[Image] ' + (message.message.imageMessage.caption || '');
            case 'videoMessage':
                return '[Video] ' + (message.message.videoMessage.caption || '');
            case 'audioMessage':
                return '[Audio Message]';
            case 'documentMessage':
                return `[Document] ${message.message.documentMessage.fileName || 'File'}`;
            case 'stickerMessage':
                return '[Sticker]';
            default:
                return `[${messageType}]`;
        }
    }

    async findRecentMessage(key) {
        // In a real implementation, you might want to maintain a recent messages cache
        // For now, return null and rely on the in-memory cache
        return null;
    }

    detectSuspiciousMessage(message) {
        const content = this.extractMessageContent(message).toLowerCase();
        
        // Suspicious patterns
        const suspiciousPatterns = [
            /http.*\.(exe|bin|scr|com|bat|vbs|js)/i,
            /script.*alert/i,
            /eval.*\(/i,
            /base64_decode/i,
            /javascript:/i,
            /onmouseover=/i,
            /onload=/i,
            /<script>/i,
            /document\.cookie/i,
            /window\.location/i,
            /phishing|scam|fraud/i,
            /bitcoin.*wallet/i,
            /password.*reset/i,
            /bank.*account/i
        ];

        // Check for suspicious links
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = content.match(urlRegex);
        if (urls) {
            for (const url of urls) {
                if (url.includes('bit.ly') || url.includes('tinyurl') || url.includes('shorte.st')) {
                    return true;
                }
            }
        }

        // Check for suspicious patterns
        return suspiciousPatterns.some(pattern => pattern.test(content));
    }


    // ==================== VIEW ONCE MESSAGE HANDLER ====================
    async setupViewOnceHandler() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (m.messages) {
                for (const msg of m.messages) {
                    await this.handleViewOnceMessage(msg);
                }
            }
        });
    }

    async handleViewOnceMessage(message) {
        try {
            // Check if it's a view-once message
            const isViewOnce = message.message?.viewOnceMessage || 
                              message.message?.viewOnceMessageV2;
            
            if (!isViewOnce) return;

            const mediaType = this.getViewOnceMediaType(message);
            if (!mediaType) return;

            // Save the media
            const savedMedia = await this.saveViewOnceMedia(message, mediaType);
            if (savedMedia) {
                const sender = message.key.participant || message.key.remoteJid;
                const chatJid = message.key.remoteJid;
                
                // Store message info
                this.viewOnceMessages.set(message.key.id, {
                    id: message.key.id,
                    mediaType: mediaType,
                    filePath: savedMedia.filePath,
                    fileName: savedMedia.fileName,
                    sender: sender,
                    chatJid: chatJid,
                    timestamp: Date.now(),
                    caption: savedMedia.caption
                });

                // Notify owner if it's not from owner
                if (this.bot.ownerJid && sender !== this.bot.ownerJid) {
                    await this.notifyOwnerAboutViewOnce(message, savedMedia, sender);
                }

                colorful.info(`📸 View-once ${mediaType} saved from ${sender}`);
            }
        } catch (error) {
            colorful.error(`View-once handler error: ${error.message}`);
        }
    }

    getViewOnceMediaType(message) {
        if (message.message?.viewOnceMessage?.imageMessage) return 'image';
        if (message.message?.viewOnceMessage?.videoMessage) return 'video';
        if (message.message?.viewOnceMessageV2?.imageMessage) return 'image';
        if (message.message?.viewOnceMessageV2?.videoMessage) return 'video';
        return null;
    }

    async saveViewOnceMedia(message, mediaType) {
        try {
            // Create saved-media directory if it doesn't exist
            if (!require('fs').existsSync(this.savedMediaPath)) {
                require('fs').mkdirSync(this.savedMediaPath, { recursive: true });
            }

            const mediaKey = mediaType === 'image' ? 
                (message.message.viewOnceMessage?.imageMessage || 
                 message.message.viewOnceMessageV2?.imageMessage) :
                (message.message.viewOnceMessage?.videoMessage || 
                 message.message.viewOnceMessageV2?.videoMessage);

            if (!mediaKey) return null;

            // Download the media
            const mediaBuffer = await this.sock.downloadMediaMessage(message);
            if (!mediaBuffer) return null;

            const fileId = message.key.id;
            const extension = mediaType === 'image' ? '.jpg' : '.mp4';
            const fileName = `viewonce_${fileId}${extension}`;
            const filePath = require('path').join(this.savedMediaPath, fileName);

            // Save file
            require('fs').writeFileSync(filePath, mediaBuffer);

            // Get caption if available
            const caption = mediaKey.caption || '';

            return {
                filePath,
                fileName,
                mediaType,
                caption,
                timestamp: Date.now()
            };

        } catch (error) {
            colorful.error(`Failed to save view-once media: ${error.message}`);
            return null;
        }
    }

    async notifyOwnerAboutViewOnce(message, savedMedia, sender) {
        try {
            const notification = `👀 *VIEW-ONCE MEDIA SAVED*\n\n` +
                               `📁 Type: ${savedMedia.mediaType}\n` +
                               `👤 From: ${sender}\n` +
                               `💬 Chat: ${message.key.remoteJid}\n` +
                               `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                               `> 👤VOUGHN_MD`;

            await this.sock.sendMessage(this.bot.ownerJid, { text: notification });
        } catch (error) {
            //colorful.error(`View-once notification failed: ${error.message}`);
        }
    }

    // Get saved view-once media
    getSavedViewOnce(mediaId = null) {
        if (mediaId) {
            return this.viewOnceMessages.get(mediaId);
        } else {
            // Return all saved media (latest first)
            return Array.from(this.viewOnceMessages.values())
                .sort((a, b) => b.timestamp - a.timestamp);
        }
    }

    // Clean up old media files
    cleanupOldMedia(maxAge = 2 * 60 * 60 * 1000) { // 2 hours default
        const now = Date.now();
        for (const [id, media] of this.viewOnceMessages.entries()) {
            if (now - media.timestamp > maxAge) {
                try {
                    if (require('fs').existsSync(media.filePath)) {
                        require('fs').unlinkSync(media.filePath);
                    }
                    this.viewOnceMessages.delete(id);
                } catch (error) {
                    colorful.error(`Cleanup failed for ${id}: ${error.message}`);
                }
            }
        }
    }




    // ==================== FEATURE CONTROL METHODS ====================
    enableFeature(featureName) {
        if (this.featureStates.hasOwnProperty(featureName)) {
            this.featureStates[featureName] = true;
            colorful.info(`✅ Enabled feature: ${featureName}`);
            return true;
        }
        return false;
    }

    disableFeature(featureName) {
        if (this.featureStates.hasOwnProperty(featureName)) {
            this.featureStates[featureName] = false;
            colorful.info(`❌ Disabled feature: ${featureName}`);
            return true;
        }
        return false;
    }

    toggleFeature(featureName) {
        if (this.featureStates.hasOwnProperty(featureName)) {
            this.featureStates[featureName] = !this.featureStates[featureName];
            colorful.info(`🔄 ${this.featureStates[featureName] ? 'Enabled' : 'Disabled'} feature: ${featureName}`);
            return this.featureStates[featureName];
        }
        return false;
    }

    getFeatureStatus(featureName) {
        return this.featureStates[featureName] || false;
    }

    getAllFeatureStatus() {
        return { ...this.featureStates };
    }

    // ==================== INITIALIZE ALL FEATURES ====================
    async initializeAllFeatures() {
        try {
            await this.setupAntiDelete();
            await this.setupAntiEdit();
            await this.setupAutoViewStatus();
            await this.setupAutoReactStatus();
            await this.setupAutoTyping();
            await this.setupAutoRecording();
            await this.setupAutoRead();
            await this.setupAntiCall();
            await this.setupAntiDeleteStatus();
            await this.setupAntiSpam();
            await this.setupAutoReactMessages();
            await this.setupAntiBug();
            await this.setupAutoBlock();
            await this.setupAntiDemote();
            await this.setupViewOnceHandler();
            await this.setupChatbot();
            
            colorful.success('✅ All features initialized successfully');
            
        } catch (error) {
            colorful.error(`❌ Failed to initialize features: ${error.message}`);
        }
    }

    // Method to cache messages from main message handler
    async processMessageForFeatures(message) {
        await this.cacheMessage(message);
        
        // Track user activity for trust scoring
        const userJid = message.key.participant || message.key.remoteJid;
        this.userActivity.set(userJid, Date.now());
        
        // Cache status messages for anti-delete status feature
        if (message.key.remoteJid === 'status@broadcast') {
            const statusContent = this.extractMessageContent(message);
            if (statusContent && statusContent !== 'Unsupported message type') {
                this.deletedStatus.set(message.key.id, statusContent);
            }
        }
    }

    // Cleanup method
    cleanup() {
        // Clear all timeouts
        this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.recordingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.typingTimeouts.clear();
        this.recordingTimeouts.clear();
    }
}

module.exports = Features;