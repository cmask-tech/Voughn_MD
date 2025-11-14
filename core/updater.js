// core/updater.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colorful } = require('./utils');

class CentralUpdater {
    constructor(bot) {
        this.bot = bot;
        this.updateChannel = '120363404344928416@newsletter'; // Your channel ID
        this.updateCheckInterval = 60 * 60 * 1000; // 5 minutes
        this.lastUpdateCheck = 0;
        this.updateVersion = '2.0.0';
    }

    async initialize() {
        // Check for updates on startup
        setTimeout(() => this.checkForUpdates(), 10000);
        
        // Set up periodic update checks
        setInterval(() => this.checkForUpdates(), this.updateCheckInterval);
        
        // Listen for update commands
        this.setupUpdateHandlers();
    }

    setupUpdateHandlers() {
        this.bot.sock.ev.on('messages.upsert', async (m) => {
            if (m.messages) {
                for (const msg of m.messages) {
                    await this.handleUpdateMessage(msg);
                }
            }
        });
    }

    async handleUpdateMessage(msg) {
        if (!msg.message?.extendedTextMessage?.text) return;

        const text = msg.message.extendedTextMessage.text;
        const isFromUpdateChannel = msg.key.remoteJid === this.updateChannel;
        const isFromOwner = msg.key.participant === this.bot.ownerJid || 
                           msg.key.remoteJid === this.bot.ownerJid;

        // Handle update commands from owner
        if (isFromOwner && text.startsWith('!update')) {
            await this.handleUpdateCommand(msg, text);
        }

        // Handle update notifications from channel
        if (isFromUpdateChannel && text.includes('[UPDATE]')) {
            await this.processUpdateNotification(msg, text);
        }
    }

    async handleUpdateCommand(msg, text) {
        const args = text.split(' ');
        const command = args[1];

        try {
            switch (command) {
                case 'push':
                    await this.pushUpdateToBots(msg);
                    break;
                case 'check':
                    await this.checkForUpdates(true);
                    break;
                case 'force':
                    await this.forceUpdate(msg);
                    break;
                case 'version':
                    await this.showVersion(msg);
                    break;
                default:
                    await this.showUpdateHelp(msg);
            }
        } catch (error) {
            colorful.error(`Update command error: ${error.message}`);
            await this.bot.sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Update error: ${error.message}`
            });
        }
    }

    async pushUpdateToBots(sourceMsg) {
        if (!this.bot.ownerJid) {
            await this.bot.sock.sendMessage(sourceMsg.key.remoteJid, {
                text: '❌ Owner not set'
            });
            return;
        }

        // Create update package
        const updateData = this.createUpdatePackage();
        
        // Send to update channel
        await this.bot.sock.sendMessage(this.updateChannel, {
            text: `🔄 [UPDATE] ${this.updateVersion}\n\n` +
                  `📦 Update package ready!\n` +
                  `👤 Pushed by: ${this.bot.ownerJid}\n` +
                  `⏰ Time: ${new Date().toLocaleString()}\n\n` +
                  `💡 All connected bots will automatically update.`
        });

        await this.bot.sock.sendMessage(sourceMsg.key.remoteJid, {
            text: `✅ Update package v${this.updateVersion} pushed to channel!\n\n` +
                  `All connected bots will download and apply the update.`
        });

        colorful.success(`Update v${this.updateVersion} pushed to channel`);
    }

    createUpdatePackage() {
        const filesToUpdate = [
            'core/commands.js',
            'core/features.js',
            'core/updater.js',
            'core/utils.js',
            'bot.js'
        ];

        const package = {
            version: this.updateVersion,
            timestamp: Date.now(),
            files: {}
        };

        // Read and encode files
        for (const file of filesToUpdate) {
            try {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    package.files[file] = Buffer.from(content).toString('base64');
                }
            } catch (error) {
                colorful.error(`Failed to read ${file}: ${error.message}`);
            }
        }

        return package;
    }

    async processUpdateNotification(msg, text) {
        colorful.info('📥 Update notification received from channel');
        
        // Extract version from message
        const versionMatch = text.match(/\[UPDATE\]\s+([\d.]+)/);
        if (!versionMatch) return;

        const newVersion = versionMatch[1];
        
        if (this.isNewerVersion(newVersion, this.updateVersion)) {
            await this.bot.sock.sendMessage(msg.key.remoteJid, {
                text: `🔄 Downloading update v${newVersion}...`
            });

            // Download and apply update
            await this.downloadAndApplyUpdate();
        }
    }

    async downloadAndApplyUpdate() {
        try {
            colorful.info('📥 Downloading update package...');
            
            // In a real implementation, you would fetch from a server
            // For now, we'll simulate the update process
            const updatePackage = await this.fetchUpdatePackage();
            
            if (updatePackage && updatePackage.files) {
                await this.applyUpdateFiles(updatePackage.files);
                this.updateVersion = updatePackage.version;
                
                colorful.success(`✅ Updated to v${this.updateVersion}`);
                
                // Notify owner
                if (this.bot.ownerJid) {
                    await this.bot.sock.sendMessage(this.bot.ownerJid, {
                        text: `✅ Bot updated to v${this.updateVersion}\n\n` +
                              `🔄 Restarting to apply changes...`
                    });
                }

                // Restart the bot
                setTimeout(() => {
                    process.exit(0); // PM2 will restart it
                }, 3000);
            }
        } catch (error) {
            colorful.error(`Update failed: ${error.message}`);
        }
    }

    async fetchUpdatePackage() {
        // Simulate fetching update package
        // In production, this would fetch from your server or GitHub
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.createUpdatePackage());
            }, 2000);
        });
    }

    async applyUpdateFiles(files) {
        for (const [filePath, base64Content] of Object.entries(files)) {
            try {
                const content = Buffer.from(base64Content, 'base64').toString('utf8');
                const dir = path.dirname(filePath);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // Write file
                fs.writeFileSync(filePath, content, 'utf8');
                colorful.info(`✅ Updated: ${filePath}`);
            } catch (error) {
                colorful.error(`Failed to update ${filePath}: ${error.message}`);
            }
        }
    }

    async checkForUpdates(manualCheck = false) {
        const now = Date.now();
        if (!manualCheck && (now - this.lastUpdateCheck < this.updateCheckInterval)) {
            return;
        }

        this.lastUpdateCheck = now;

        try {
            // Check GitHub or your server for updates
            const latestVersion = await this.getLatestVersion();
            
            if (this.isNewerVersion(latestVersion, this.updateVersion)) {
                colorful.info(`🔄 Update available: v${latestVersion}`);
                
                if (this.bot.ownerJid) {
                    await this.bot.sock.sendMessage(this.bot.ownerJid, {
                        text: `🔄 Update Available!\n\n` +
                              `Current: v${this.updateVersion}\n` +
                              `Latest: v${latestVersion}\n\n` +
                              `Use !update force to update now.`
                    });
                }
            } else if (manualCheck) {
                await this.bot.sock.sendMessage(this.bot.ownerJid, {
                    text: `✅ You're running the latest version: v${this.updateVersion}`
                });
            }
        } catch (error) {
            colorful.error(`Update check failed: ${error.message}`);
        }
    }

    async getLatestVersion() {
        // Check GitHub for latest version
        try {
            const response = await axios.get('https://api.github.com/repos/cmask-tech/Voughn_MD/releases/latest', {
                timeout: 10000
            });
            return response.data.tag_name.replace('v', '');
        } catch (error) {
            // Fallback to current version + 0.0.1
            const [major, minor, patch] = this.updateVersion.split('.').map(Number);
            return `${major}.${minor}.${patch + 1}`;
        }
    }

    isNewerVersion(newVersion, currentVersion) {
        const [newMajor, newMinor, newPatch] = newVersion.split('.').map(Number);
        const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);

        return newMajor > currentMajor ||
               (newMajor === currentMajor && newMinor > currentMinor) ||
               (newMajor === currentMajor && newMinor === currentMinor && newPatch > currentPatch);
    }

    async forceUpdate(msg) {
        await this.bot.sock.sendMessage(msg.key.remoteJid, {
            text: '🔄 update check...'
        });
        await this.checkForUpdates(true);
    }

    async showVersion(msg) {
        await this.bot.sock.sendMessage(msg.key.remoteJid, {
            text: `🤖 *Bot Version*\n\n` +
                  `Current: v${this.updateVersion}\n` +
                  `Uptime: ${Math.floor(process.uptime() / 60)} minutes\n` +
                  `Node.js: ${process.version}`
        });
    }

    async showUpdateHelp(msg) {
        const helpText = `🔄 *UPDATE SYSTEM HELPER*

*Commands:*
.update push - Push update to all bots
.update check - Check for updates
.update force - Force update now
.update version - Show current version


*Current Version:* v${this.updateVersion}`;

        await this.bot.sock.sendMessage(msg.key.remoteJid, { text: helpText });
    }
}

module.exports = CentralUpdater;