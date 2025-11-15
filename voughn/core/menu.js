// core/menu.js
const commands = require('./commands');
const database = require('./database');
const { colorful } = require('./utils');

class MenuManager {
    constructor() {
        this.categories = {
            owner: {
                title: '👑 OWNER',
                description: 'Bot owner only commands',
                commands: []
            },
            group: {
                title: '👥 GROUP', 
                description: 'Group management commands',
                commands: []
            },
            general: {
                title: '🔧 GENERAL',
                description: 'General purpose commands',
                commands: []
            },
            fun: {
                title: '🎮 FUN',
                description: 'Entertainment and games',
                commands: []
            },
            settings: {
                title: '⚙️ SETTINGS',
                description: 'Bot settings and feature control',
                commands: []
            },
            tools: {
                title: '🛠️ TOOL',
                description: 'Utility and tool commands',
                commands: []
            },
            media: {
                title: '📷 MEDIA',
                description: 'Image, video, and audio commands',
                commands: []
            },
            download: {
                title: '📥 DOWNLOAD',
                description: 'Download from various platforms',
                commands: []
            },
            search: {
                title: '🔍 SEARCH',
                description: 'Search information online',
                commands: []
            },
            ai: {
                title: '🤖 AI',
                description: 'Artificial intelligence commands',
                commands: []
            },
            nsfw: {
                title: '🔞 NSFW',
                description: 'Adult content commands (if enabled)',
                commands: []
            },
            debug: {
                title: '🔧 DEBUG',
                description: 'Debug and troubleshooting commands',
                commands: []
            },
            status: {
                title: '📊 STATUS',
                description: 'Status and monitoring commands',
                commands: []
            },
            features: {
                title: '🎛️ FEATURES',
                description: 'Feature control commands',
                commands: []
            }
        };
    }

    // Register commands to categories
    registerCommand(category, name, description, options = {}) {
        if (!this.categories[category]) {
            colorful.warning(`Category ${category} not found!`);
            return;
        }
        
        this.categories[category].commands.push({
            name,
            description,
            ownerOnly: options.ownerOnly || false,
            groupOnly: options.groupOnly || false,
            requiresAdmin: options.requiresAdmin || false
        });
    }

    // Generate menu text
    async generateMenu(prefix, userJid = null) {
        const settings = await database.getBotSettings();
        const isOwner = userJid ? await database.isOwner(userJid) : false;
        const isSudo = userJid ? await database.isSudo(userJid) : false;
        const mode = settings.mode || 'public';

        

        let menuText = `*╭───❂* 𝗕𝗢𝗧-𝗜𝗡𝗙𝗢 *❂───❂*\n`;
        menuText += `╏✺╭───────────❂*\n`;
        menuText += `┋⍟┃🤖 *VOUGHN_MD*\n`;
        menuText += `┋⍟┃ *ADVANCED WHATSAPP BOT*\n`;
        menuText += `┋⍟┃\n`;
        menuText += `┋⍟┃ *Prefix:* [ *${prefix}* ]\n`;
        menuText += `┋⍟┃ *Mode:* ${mode.toUpperCase()}\n`;
        menuText += `┋⍟┃ *Owner:* ${isOwner ? '✅ Yes' : 'Not owner'}\n`;
        menuText += `┋⍟┃ *Sudo:* ${isSudo ? '✅ Yes' : 'Not sudo'}\n`;
        menuText += `┋⍟┃ *Commands:* ${this.getTotalCommands()}\n`;
        menuText += `*╰─❂✧voughMD-𝑩𝒐𝒕✧───❂*\n\n`;

        menuText += `\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B`;
        menuText += `\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\n`;
        menuText += `\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\n`;
        menuText += `\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\n`;
        menuText += `\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B`;
        menuText += `\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B`;
        menuText += `\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B`;


        // Add categories with commands
        for (const [categoryKey, category] of Object.entries(this.categories)) {
            if (category.commands.length === 0) continue;

            let categoryText = `${category.title}\n`;
            categoryText += `*✺ ───────────❂*\n`;

            let visibleCommands = 0;
            
            for (const cmd of category.commands) {
                // Check permissions
                if (cmd.ownerOnly && !isOwner) continue;
                if (mode === 'private' && !isOwner && !isSudo && !cmd.ownerOnly) continue;
                
                visibleCommands++;
                
                let commandLine = `┋⍟ ${prefix}${cmd.name}`;
                if (cmd.ownerOnly) commandLine += ` `;
                if (cmd.groupOnly) commandLine += ` `;
                if (cmd.requiresAdmin) commandLine += ` `;
                commandLine += `\n`;
                
                categoryText += commandLine;
            }

            // Only show category if it has visible commands OR if it's owner category and user is owner
            if (visibleCommands > 0 || (categoryKey === 'owner' && isOwner)) {
                categoryText += `╰── ❂───❂ \n\n`;
                menuText += categoryText;
            }
        }

        // Add footer
        menuText += `> 📖 *USER GUIDE*\n`;
        menuText += `╰─| Use ${prefix}help <command> for help\n\n`;

        menuText += `> ┋⍟ 🔗 *BOT INFO*\n`;
        menuText += `> ╰─|🪀️ Version: 2.0.0 | \n> By: Voughn || Cmask`;

        return menuText;
    }

    // Get help for specific command
    async generateCommandHelp(prefix, commandName, userJid = null) {
        // Find the command in any category
        for (const [categoryKey, category] of Object.entries(this.categories)) {
            const command = category.commands.find(cmd => cmd.name === commandName);
            if (command) {
                const isOwner = userJid ? await database.isOwner(userJid) : false;
                
                // Check permissions
                if (command.ownerOnly && !isOwner) {
                    return `❌ You don't have permission to view help for ${prefix}${commandName}`;
                }

                let helpText = `🔍 *COMMAND HELP: ${prefix}${commandName}*\n\n`;
                helpText += `📝 *Description:*\n${command.description}\n\n`;
                
                
                helpText += `⚙️  *Permissions:*\n`;
                helpText += `┋⍟┃ Owner Only: ${command.ownerOnly ? '✅ Yes' : '❌ No'}\n`;
                helpText += `┋⍟┃ Group Only: ${command.groupOnly ? '✅ Yes' : '❌ No'}\n`;
                helpText += `╰─ Admin Required: ${command.requiresAdmin ? '✅ Yes' : '❌ No'}\n\n`;

                helpText += `💡 *Usage:*\n${prefix}${commandName}`;
                
                // Add example if available
                if (command.example) {
                    helpText += `\n\n📚 *Example:*\n${command.example}`;
                }

                return helpText;
            }
        }
        
        return `❌ Command "${commandName}" not found. Use ${prefix}menu to see all commands.`;
    }

    // Get total number of commands
    getTotalCommands() {
        let total = 0;
        for (const category of Object.values(this.categories)) {
            total += category.commands.length;
        }
        return total;
    }

    // Initialize with default commands
    initializeDefaultCommands() {
        // 👑 OWNER COMMANDS
        this.registerCommand('owner', 'setprefix', 'Change bot prefix',);
        this.registerCommand('owner', 'mode', 'Switch between public/private mode',);
        this.registerCommand('owner', 'addsudo', 'Add sudo user');
        this.registerCommand('owner', 'update', 'Switch between public/private mode',);
        this.registerCommand('owner', 'delsudo', 'Remove sudo user');
        this.registerCommand('owner', 'broadcast', 'Broadcast message to all chats');
        this.registerCommand('owner', 'eval', 'Execute JavaScript code');
        this.registerCommand('owner', 'exec', 'Execute shell command');
        this.registerCommand('owner', 'backup', 'Backup bot data');
        this.registerCommand('owner', 'restart', 'Restart the bot');
        this.registerCommand('owner', 'shutdown', 'Shutdown the bot',);
        this.registerCommand('owner', 'update', 'Bot update system',);
        this.registerCommand('owner', 'clearsession', 'Clear session files and reset connection',);

        // 👥 GROUP COMMANDS
        this.registerCommand('group', 'kick', 'Kick user from group', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'promote', 'Promote user to admin', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'demote', 'Demote admin to member', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'tagall', 'Tag all group members', { groupOnly: true });
        this.registerCommand('group', 'groupinfo', 'Show group information', { groupOnly: true });
        this.registerCommand('group', 'antilink', 'Toggle anti-link protection', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'welcome', 'Set welcome message', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'setdesc', 'Set group description', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'poll', 'Create a poll', { groupOnly: true });
        this.registerCommand('group', 'setname', 'Set group name', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'close', 'Close group (admins only)', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'open', 'Open group for all members', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'editsettings', 'Edit group settings', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'tagadmin', 'Tag all group admins', { groupOnly: true });
        this.registerCommand('group', 'hidetag', 'Send hidden tag to all members', { groupOnly: true, requiresAdmin: true });
        
        // NEW GROUP COMMANDS
        this.registerCommand('group', 'opentime', 'Open group for specific time', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'closetime', 'Close group for specific time', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'kickall', 'Kick all members from group', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'kickinactive', 'Kick inactive members', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'add', 'Add user to group', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'invite', 'Generate group invite link', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'link', 'Get group invite link', { groupOnly: true });
        this.registerCommand('group', 'resetlink', 'Reset group invite link', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'antibot', 'Toggle anti-bot protection (auto-kick bots)', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'antigroupmention', 'Toggle anti-group mention protection', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'antitag', 'Toggle anti-tag protection', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'antitagadmin', 'Toggle anti-admin tag protection', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'goodbye', 'Set goodbye message for leaving members', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'userid', 'Get user ID (reply to user or mention)', { groupOnly: true });
        this.registerCommand('group', 'listactive', 'List most active members in group', { groupOnly: true, requiresAdmin: true });
        this.registerCommand('group', 'approveall', 'Approve all pending join requests', { groupOnly: true, requiresAdmin: true });

        // ⚙️ SETTINGS COMMANDS (Global anti-features)
        // In menu.js - Add these to your categories
        this.registerCommand('settings', 'chatbot', 'Toggle AI chatbot (owner only)', { ownerOnly: true });
        this.registerCommand('settings', 'ai', 'Chat with AI directly');
        this.registerCommand('settings', 'chat', 'Alias for .ai command');
        this.registerCommand('settings', 'antidelete', 'Toggle anti-delete protection (shows deleted messages)');
        this.registerCommand('settings', 'antiedit', 'Toggle anti-edit protection (shows message edits)',);
        this.registerCommand('settings', 'antispam', 'Toggle anti-spam protection (works everywhere)');
        this.registerCommand('settings', 'autoview', 'Toggle auto-view status updates',);
        this.registerCommand('settings', 'autoreact', 'Toggle auto-react to status updates');
        this.registerCommand('settings', 'autoreactmsg', 'Toggle auto-react to messages',);
        this.registerCommand('settings', 'autotyping', 'Toggle auto-typing indicators');
        this.registerCommand('settings', 'autorecording', 'Toggle auto-recording indicators');
        this.registerCommand('settings', 'autoread', 'Toggle auto-read messages');
        this.registerCommand('settings', 'anticall', 'Toggle decline all incoming calls');
        this.registerCommand('settings', 'antideletestatus', 'Toggle show deleted status to yourself');
        this.registerCommand('settings', 'autorecordtyping', 'Enable both recording and typing indicators');

        // 🔧 GENERAL COMMANDS
        this.registerCommand('general', 'menu', 'Show this menu');
        this.registerCommand('general', 'ping', 'Test bot response');
        this.registerCommand('general', 'help', 'Get help for a command');
        this.registerCommand('general', 'stats', 'Show bot statistics');
        this.registerCommand('general', 'profile', 'Show user profile');
        this.registerCommand('general', 'listblock', 'List blocked users');
        this.registerCommand('general', 'speed', 'Test bot speed');

        // 📊 STATUS COMMANDS
        this.registerCommand('status', 'uptime', 'Show bot uptime and system info');
        this.registerCommand('status', 'runtime', 'Show bot uptime');
        this.registerCommand('status', 'status', 'Quick bot status check');

        // 🎮 FUN COMMANDS
        this.registerCommand('fun', 'joke', 'Get a random joke');
        this.registerCommand('fun', 'quote', 'Get inspirational quote');
        this.registerCommand('fun', 'fact', 'Get random fact');
        this.registerCommand('fun', 'meme', 'Get random meme');
        this.registerCommand('fun', 'coinflip', 'Flip a coin');
        this.registerCommand('fun', 'dice', 'Roll a dice');
        this.registerCommand('fun', '8ball', 'Magic 8 ball');
        this.registerCommand('fun', 'rate', 'Rate something');
        this.registerCommand('fun', 'ship', 'Ship two people');

        // 🛠️ TOOL COMMANDS
        this.registerCommand('tools', 'sticker', 'Create sticker from image');
        this.registerCommand('tools', 'crop', 'Crop image');
        this.registerCommand('tools', 'blur', 'Blur image');
        this.registerCommand('tools', 'rotate', 'Rotate image');
        this.registerCommand('tools', 'weather', 'Get current weather for a city');
        this.registerCommand('tools', 'forecast', 'Get 5-day weather forecast');
        this.registerCommand('tools', 'weathermultiple', 'Get weather for multiple cities');
        this.registerCommand('tools', 'text2img', 'Convert text to image');
        this.registerCommand('tools', 'qr', 'Generate QR code');
        this.registerCommand('tools', 'calc', 'Calculator');
        this.registerCommand('tools', 'currency', 'Currency converter');
        this.registerCommand('tools', 'vv', 'Send last saved view-once media to current chat');
        this.registerCommand('tools', 'vv2', 'Send last saved view-once media to personal chat',);
        this.registerCommand('tools', 'vvlist', 'List all saved view-once media');
        this.registerCommand('tools', 'vvget', 'Get specific view-once media by ID');

        // 📥 DOWNLOAD COMMANDS
        this.registerCommand('download', 'apk', 'Download and send APK files');
        this.registerCommand('download', 'play', 'Download and send songs/audio');
        this.registerCommand('download', 'mediafire', 'Download and send files from MediaFire');
        this.registerCommand('download', 'video', 'Download and send videos');
        this.registerCommand('download', 'download', 'Show download menu');
        this.registerCommand('download', 'ytmp3', 'Download YouTube audio');
        this.registerCommand('download', 'ytmp4', 'Download YouTube video');
        this.registerCommand('download', 'tiktok', 'Download TikTok video');
        this.registerCommand('download', 'instagram', 'Download Instagram media');
        this.registerCommand('download', 'facebook', 'Download Facebook video');
        this.registerCommand('download', 'twitter', 'Download Twitter video');

        // 🔍 SEARCH COMMANDS
        this.registerCommand('search', 'google', 'Search on Google');
        this.registerCommand('search', 'youtube', 'Search on YouTube');
        this.registerCommand('search', 'wiki', 'Search Wikipedia');
        this.registerCommand('search', 'lyrics', 'Search song lyrics');
        this.registerCommand('search', 'movie', 'Search movie information');

        // 🤖 AI COMMANDS
        this.registerCommand('ai', 'gpt', 'Chat with GPT');
        this.registerCommand('ai', 'dalle', 'Generate image with DALL-E');
        this.registerCommand('ai', 'gemini', 'Chat with Gemini');
        this.registerCommand('ai', 'aiimg', 'AI image analysis');
        this.registerCommand('ai', 'chatbot', 'Chat with AI assistant (English/Kiswahili)');
        this.registerCommand('ai', 'ai', 'Alias for chatbot command');
        this.registerCommand('ai', 'translate', 'Translate text');

        // 🔧 DEBUG COMMANDS
        this.registerCommand('debug', 'debug', 'Show detailed debug information for troubleshooting', { ownerOnly: true });
        this.registerCommand('debug', 'session', 'Show session information and status', { ownerOnly: true });
        this.registerCommand('debug', 'features', 'Show all feature statuses', { ownerOnly: true });
        this.registerCommand('debug', 'test', 'Test bot functionality', { ownerOnly: true });

        // 🎛️ FEATURES COMMANDS
        this.registerCommand('features', 'features', 'List all available features and their status');

        // Add more commands as needed...
    }
}

// Create and initialize menu manager
const menuManager = new MenuManager();
menuManager.initializeDefaultCommands();

module.exports = menuManager;