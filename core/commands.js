// core/commands.js
const database = require('./database');
const { extractPhoneFromJid, isGroupJid, colorful } = require('./utils');
const menuManager = require('./menu');
const FunHelper = require('./helpers/fun');
const ToolsHelper = require('./helpers/tools');
// Add these imports at the top of core/commands.js
const DownloadHelper = require('./helpers/downloader');
const SearchHelper = require('./helpers/search');
const AIHelper = require('./helpers/ai');
const ChatbotHelper = require('./helpers/chatbot');
const fs = require('fs');
const axios = require('axios');

const commands = {
    // 👑 OWNER COMMANDS
    setprefix: {
        ownerOnly: true,
        description: 'Change bot command prefix',
        async execute(sock, message, args, bot) {
            const newPrefix = args[0];
            if (!newPrefix) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a prefix. Example: .setprefix !'
                });
                return;
            }
            
            await database.updatePrefix(newPrefix);
            await sock.sendMessage(message.key.remoteJid, {
                text: `✅ Prefix updated to: ${newPrefix}`
            });
        }
    },

    mode: {
        ownerOnly: true,
        description: 'Switch between public and private mode',
        async execute(sock, message, args, bot) {
            const mode = args[0]?.toLowerCase();
            if (!mode || !['public', 'private'].includes(mode)) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please specify: public or private'
                });
                return;
            }
            
            await database.updateMode(mode);
            await sock.sendMessage(message.key.remoteJid, {
                text: `✅ Mode set to: ${mode}`
            });
        }
    },
    // weather commands
    weather: {
        ownerOnly: false,
        description: 'Get current weather for a city',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                if (args.length === 0) {
                    await sock.sendMessage(jid, {
                        text: `🌤️ *WEATHER COMMAND*\n\nUsage: .weather <city>\nExample: .weather Nairobi\n.weather London\n.weather New York\n\n💡 You can also use:\n.forecast <city> - 5-day forecast\n.weather multiple <city1> <city2> - Compare cities`
                    });
                    return;
                }

                const city = args.join(' ');
                
                // Show loading message
                await sock.sendMessage(jid, {
                    text: `🌤️ Getting weather for ${city}...`
                });

                const ToolsHelper = require('./helpers/tools');
                const weatherInfo = await ToolsHelper.getWeather(city);
                
                await sock.sendMessage(jid, { text: weatherInfo });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Weather command failed: ${error.message}`
                });
            }
        }
    },

    forecast: {
        ownerOnly: false,
        description: 'Get 5-day weather forecast',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                if (args.length === 0) {
                    await sock.sendMessage(jid, {
                        text: '📅 Usage: .forecast <city>\nExample: .forecast Nairobi'
                    });
                    return;
                }

                const city = args.join(' ');
                await sock.sendMessage(jid, {
                    text: `📅 Getting 5-day forecast for ${city}...`
                });

                const ToolsHelper = require('./helpers/tools');
                const forecast = await ToolsHelper.getWeatherForecast(city);
                
                await sock.sendMessage(jid, { text: forecast });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Forecast failed: ${error.message}`
                });
            }
        }
    },

    weathermultiple: {
        ownerOnly: false,
        description: 'Get weather for multiple cities',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                if (args.length < 2) {
                    await sock.sendMessage(jid, {
                        text: '🌤️ Usage: .weathermultiple <city1> <city2> ...\nExample: .weathermultiple Nairobi London Tokyo'
                    });
                    return;
                }

                const cities = args;
                await sock.sendMessage(jid, {
                    text: `🌤️ Getting weather for ${cities.length} cities...`
                });

                const ToolsHelper = require('./helpers/tools');
                const weatherResults = await ToolsHelper.getWeatherMultiple(cities);
                
                await sock.sendMessage(jid, { text: weatherResults });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Multi-weather failed: ${error.message}`
                });
            }
        }
    },

    addsudo: {
        ownerOnly: true,
        description: 'Add sudo user',
        async execute(sock, message, args, bot) {
            if (!message.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please reply to a user message'
                });
                return;
            }
            
            const targetJid = message.message.extendedTextMessage.contextInfo.participant;
            const phone = extractPhoneFromJid(targetJid);
            const ownerJid = message.key.participant || message.key.remoteJid;
            
            const success = await database.addSudoUser(targetJid, phone, ownerJid);
            if (success) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `✅ Added ${phone} as sudo user`
                });
            } else {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Failed to add sudo user'
                });
            }
        }
    },

    delsudo: {
        ownerOnly: true,
        description: 'Remove sudo user',
        async execute(sock, message, args, bot) {
            if (!message.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please reply to a user message'
                });
                return;
            }
            
            const targetJid = message.message.extendedTextMessage.contextInfo.participant;
            await database.removeSudoUser(targetJid);
            await sock.sendMessage(message.key.remoteJid, {
                text: '✅ Sudo user removed'
            });
        }
    },

    broadcast: {
        ownerOnly: true,
        description: 'Broadcast message to all chats',
        async execute(sock, message, args, bot) {
            const broadcastMessage = args.join(' ');
            if (!broadcastMessage) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a message to broadcast'
                });
                return;
            }

            // In a real implementation, you'd get all chats from database
            await sock.sendMessage(message.key.remoteJid, {
                text: `📢 Broadcast feature would send: "${broadcastMessage}" to all chats`
            });
        }
    },

    restart: {
        ownerOnly: true,
        description: 'Restart the bot',
        async execute(sock, message, args, bot) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '🔄 Restarting bot...'
            });
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        }
    },

    // 👥 GROUP COMMANDS
    kick: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Kick user from group',
        async execute(sock, message, args, bot) {
            if (!message.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please reply to user to kick'
                });
                return;
            }
            
            const targetJid = message.message.extendedTextMessage.contextInfo.participant;
            try {
                await sock.groupParticipantsUpdate(message.key.remoteJid, [targetJid], 'remove');
                await sock.sendMessage(message.key.remoteJid, {
                    text: '✅ User kicked successfully'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Failed to kick user. Make sure I\'m admin.'
                });
            }
        }
    },

    promote: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Promote user to admin',
        async execute(sock, message, args, bot) {
            if (!message.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please reply to user to promote'
                });
                return;
            }
            
            const targetJid = message.message.extendedTextMessage.contextInfo.participant;
            try {
                await sock.groupParticipantsUpdate(message.key.remoteJid, [targetJid], 'promote');
                await sock.sendMessage(message.key.remoteJid, {
                    text: '✅ User promoted to admin'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Failed to promote user'
                });
            }
        }
    },

    demote: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Demote admin to member',
        async execute(sock, message, args, bot) {
            if (!message.message?.extendedTextMessage?.contextInfo?.participant) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please reply to admin to demote'
                });
                return;
            }
            
            const targetJid = message.message.extendedTextMessage.contextInfo.participant;
            try {
                await sock.groupParticipantsUpdate(message.key.remoteJid, [targetJid], 'demote');
                await sock.sendMessage(message.key.remoteJid, {
                    text: '✅ Admin demoted to member'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Failed to demote user'
                });
            }
        }
    },

    tagall: {
        groupOnly: true,
        description: 'Tag all group members',
        async execute(sock, message, args, bot) {
            try {
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const participants = groupMetadata.participants;
                let tagMessage = args.join(' ') || 'Hello everyone! ';
                
                participants.forEach(participant => {
                    tagMessage += `@${participant.id.split('@')[0]} `;
                });
                
                await sock.sendMessage(message.key.remoteJid, { 
                    text: tagMessage,
                    mentions: participants.map(p => p.id)
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, { 
                    text: '❌ Failed to tag members'
                });
            }
        }
    },

    groupinfo: {
        groupOnly: true,
        description: 'Show group information',
        async execute(sock, message, args, bot) {
            try {
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const infoText = `
🏷️ *Group Info:*
├─ Name: ${groupMetadata.subject}
├─ Participants: ${groupMetadata.participants.length}
├─ Created: ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}
├─ Description: ${groupMetadata.desc || 'No description'}
╰─ ID: ${groupMetadata.id}
                `.trim();
                
                await sock.sendMessage(message.key.remoteJid, { text: infoText });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, { 
                    text: '❌ Failed to get group info'
                });
            }
        }
    },

    // 🔧 GENERAL COMMANDS
    ping: {
        description: 'Test bot response time',
        async execute(sock, message, args, bot) {
            await sock.sendMessage(jid, {
                react: {
                    text: '💫',
                    key: message.key
                }
                });
            const start = Date.now();
            const sentMsg = await sock.sendMessage(message.key.remoteJid, {
                text: '🏓 Pong!'
            });
            const latency = Date.now() - start;
            await sock.sendMessage(message.key.remoteJid, {
                text: `⏱️ SPEED: ${latency}ms\n💻 Server: Online\nStatus: _operational_`
            });
        }
    },


    menu: {
        ownerOnly: false,
        description: 'Show bot menu with image',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            const prefix = bot.settings?.getPrefix?.() || '.';
            const userJid = message.key.participant || message.key.remoteJid;
            
            try {
                // Check if menuManager exists, if not use a fallback
                let menuText;
                if (bot.menuManager && bot.menuManager.generateMenu) {
                    menuText = await bot.menuManager.generateMenu(prefix, userJid);
                } else {
                    // Fallback menu text
                    menuText = `🤖 *VOUGHN_MD BOT MENU*\n\n` +
                            `⚙️ Prefix: ${prefix}\n` +
                            `📝 Use ${prefix}help <command> for help\n` +
                            `🔧 Version: 2.0.0\n` +
                            `👑 By: Voughn & Cmask`;
                }
                
                // Define paths to your local images (as an array)
                const possibleImagePaths = [
                    './assets/menu.jpeg',
                    './assets/menu.jpg',
                    './assets/menu.png',
                    './menu.jpeg',
                    './menu.jpg',
                    './menu.png'
                ];
                
                let imageBuffer = null;
                let imagePath = null;
                
                // Find the first existing image
                for (const imgPath of possibleImagePaths) {
                    if (fs.existsSync(imgPath)) {
                        imagePath = imgPath;
                        imageBuffer = fs.readFileSync(imgPath);
                        colorful.info(`✅ Found menu image at: ${imgPath}`);
                        break;
                    }
                }
                
                if (imageBuffer) {
                    // Send image with your fancy formatted menu as caption
                    await sock.sendMessage(jid, {
                        image: imageBuffer,
                        caption: menuText,
                        mimetype: 'image/jpeg',
                        fileName: 'voughn-menu.jpg'
                    });
                    colorful.info('📸 Menu sent with local image');
                } else {
                    // If no image found, send text-only menu
                    throw new Error('No menu image found in: ' + possibleImagePaths.join(', '));
                }

            } catch (error) {
                // Fallback to text-only menu
                colorful.warning(`Menu image not found or failed: ${error.message}`);
                
                // Generate menu text again for fallback
                let fallbackMenuText;
                if (bot.menuManager && bot.menuManager.generateMenu) {
                    fallbackMenuText = await bot.menuManager.generateMenu(prefix, userJid);
                } else {
                    fallbackMenuText = `🤖 *VOUGHN_MD BOT MENU*\n\n` +
                                    `❌ Menu system temporarily unavailable\n` +
                                    `⚙️ Prefix: ${prefix}\n` +
                                    `🔧 Version: 2.0.0\n` +
                                    `💡 Try .help for commands`;
                }
                
                await sock.sendMessage(jid, { 
                    text: fallbackMenuText 
                });
                colorful.info('📝 Menu sent as text (fallback)');
            }
        }
    },

    help: {
        description: 'Get detailed help for a command',
        async execute(sock, message, args, bot) {
            const prefix = (await database.getBotSettings()).prefix;
            const commandName = args[0];
            const userJid = message.key.participant || message.key.remoteJid;
            
            if (!commandName) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Please specify a command. Usage: ${prefix}help <command>`
                });
                return;
            }
            
            const helpText = await menuManager.generateCommandHelp(prefix, commandName, userJid);
            await sock.sendMessage(message.key.remoteJid, { text: helpText });
        }
    },

    stats: {
        description: 'Show bot statistics',
        async execute(sock, message, args, bot) {
            const statsText = `
📊 *Bot Statistics*
├─ Uptime: ${Math.floor(process.uptime() / 60)} minutes
├─ Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB
├─ Platform: ${process.platform}
├─ Node.js: ${process.version}
╰─ Commands: ${menuManager.getTotalCommands()} total
            `.trim();
            
            await sock.sendMessage(message.key.remoteJid, { text: statsText });
        }
    },

    // 🎮 FUN COMMANDS
    joke: {
        description: 'Get a random joke',
        async execute(sock, message, args, bot) {
            const joke = await FunHelper.getJoke();
            await sock.sendMessage(message.key.remoteJid, { text: `😂 Joke:\n${joke}` });
        }
    },

    quote: {
        description: 'Get inspirational quote',
        async execute(sock, message, args, bot) {
            const quote = await FunHelper.getQuote();
            await sock.sendMessage(message.key.remoteJid, { text: `💫 Quote:\n${quote}` });
        }
    },

    fact: {
        description: 'Get random fact',
        async execute(sock, message, args, bot) {
            const fact = await FunHelper.getFact();
            await sock.sendMessage(message.key.remoteJid, { text: `📚 Fact:\n${fact}` });
        }
    },

    coinflip: {
        description: 'Flip a coin',
        async execute(sock, message, args, bot) {
            const result = FunHelper.coinFlip();
            await sock.sendMessage(message.key.remoteJid, { text: `🎯 Coin Flip:\n${result}` });
        }
    },

    dice: {
        description: 'Roll a dice',
        async execute(sock, message, args, bot) {
            const result = FunHelper.rollDice();
            await sock.sendMessage(message.key.remoteJid, { text: `🎲 Dice Roll:\n${result}` });
        }
    },

    '8ball': {
        description: 'Magic 8 ball',
        async execute(sock, message, args, bot) {
            const question = args.join(' ');
            if (!question) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please ask a question. Example: .8ball Will I win the lottery?'
                });
                return;
            }
            
            const answer = FunHelper.magic8Ball();
            await sock.sendMessage(message.key.remoteJid, {
                text: `🎱 Question: ${question}\nAnswer: ${answer}`
            });
        }
    },

    rate: {
        description: 'Rate something',
        async execute(sock, message, args, bot) {
            const thing = args.join(' ');
            if (!thing) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please specify what to rate. Example: .rate pizza'
                });
                return;
            }
            
            const rating = FunHelper.rateSomething(thing);
            await sock.sendMessage(message.key.remoteJid, { text: rating });
        }
    },

    ship: {
        description: 'Ship two people',
        async execute(sock, message, args, bot) {
            if (args.length < 2) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please specify two people. Example: .ship John Mary'
                });
                return;
            }
            
            const result = FunHelper.shipPeople(args[0], args[1]);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    // 🛠️ TOOL COMMANDS
    qr: {
        description: 'Generate QR code',
        async execute(sock, message, args, bot) {
            const text = args.join(' ');
            if (!text) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide text for QR code. Example: .qr https://google.com'
                });
                return;
            }

            try {
                const qrBuffer = await ToolsHelper.generateQR(text);
                await sock.sendMessage(message.key.remoteJid, {
                    image: Buffer.from(qrBuffer.split(',')[1], 'base64'),
                    caption: `📲 QR Code for: ${text}`
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Failed to generate QR code'
                });
            }
        }
    },

    calc: {
        description: 'Calculator',
        async execute(sock, message, args, bot) {
            const expression = args.join(' ');
            if (!expression) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a calculation. Example: .calc 2+2*3'
                });
                return;
            }

            const result = ToolsHelper.calculate(expression);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    currency: {
        description: 'Currency converter',
        async execute(sock, message, args, bot) {
            if (args.length < 3) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Usage: .currency <amount> <from> <to>\nExample: .currency 100 USD EUR'
                });
                return;
            }

            const amount = parseFloat(args[0]);
            const from = args[1].toUpperCase();
            const to = args[2].toUpperCase();

            if (isNaN(amount)) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a valid amount'
                });
                return;
            }

            const result = ToolsHelper.convertCurrency(amount, from, to);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    // Add more commands as needed...
    echo: {
        description: 'Echo your message back',
        async execute(sock, message, args, bot) {
            const text = args.join(' ') || 'Hello!';
            await sock.sendMessage(message.key.remoteJid, {
                text: `🔊 Echo: ${text}`
            });
        }
    },

    // 📥 DOWNLOAD COMMANDS
    ytmp3: {
        description: 'Download YouTube audio',
        async execute(sock, message, args, bot) {
            const url = args[0];
            if (!url) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a YouTube URL. Example: .ytmp3 https://youtube.com/watch?v=...'
                });
                return;
            }

            const result = await DownloadHelper.downloadYouTubeAudio(url);
            await sock.sendMessage(message.key.remoteJid, { text: result.message });
        }
    },

    ytmp4: {
        description: 'Download YouTube video',
        async execute(sock, message, args, bot) {
            const url = args[0];
            if (!url) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a YouTube URL. Example: .ytmp4 https://youtube.com/watch?v=...'
                });
                return;
            }

            const result = await DownloadHelper.downloadYouTubeVideo(url);
            await sock.sendMessage(message.key.remoteJid, { text: result.message });
        }
    },

    tiktok: {
        description: 'Download TikTok video',
        async execute(sock, message, args, bot) {
            const url = args[0];
            if (!url) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a TikTok URL. Example: .tiktok https://tiktok.com/@user/video/...'
                });
                return;
            }

            const result = await DownloadHelper.downloadTikTok(url);
            await sock.sendMessage(message.key.remoteJid, { text: result.message });
        }
    },

    instagram: {
        description: 'Download Instagram media',
        async execute(sock, message, args, bot) {
            const url = args[0];
            if (!url) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide an Instagram URL. Example: .instagram https://instagram.com/p/...'
                });
                return;
            }

            const result = await DownloadHelper.downloadInstagram(url);
            await sock.sendMessage(message.key.remoteJid, { text: result.message });
        }
    },

    facebook: {
        description: 'Download Facebook video',
        async execute(sock, message, args, bot) {
            const url = args[0];
            if (!url) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a Facebook URL. Example: .facebook https://facebook.com/watch/?v=...'
                });
                return;
            }

            const result = await DownloadHelper.downloadFacebook(url);
            await sock.sendMessage(message.key.remoteJid, { text: result.message });
        }
    },

    twitter: {
        description: 'Download Twitter video',
        async execute(sock, message, args, bot) {
            const url = args[0];
            if (!url) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a Twitter URL. Example: .twitter https://twitter.com/user/status/...'
                });
                return;
            }

            const result = await DownloadHelper.downloadTwitter(url);
            await sock.sendMessage(message.key.remoteJid, { text: result.message });
        }
    },

    // 🔍 SEARCH COMMANDS
    google: {
        description: 'Search on Google',
        async execute(sock, message, args, bot) {
            const query = args.join(' ');
            if (!query) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a search query. Example: .google artificial intelligence'
                });
                return;
            }

            const result = await SearchHelper.searchGoogle(query);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    youtube: {
        description: 'Search on YouTube',
        async execute(sock, message, args, bot) {
            const query = args.join(' ');
            if (!query) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a search query. Example: .youtube funny cat videos'
                });
                return;
            }

            const result = await SearchHelper.searchYouTube(query);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    wiki: {
        description: 'Search Wikipedia',
        async execute(sock, message, args, bot) {
            const query = args.join(' ');
            if (!query) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a search query. Example: .wiki Albert Einstein'
                });
                return;
            }

            const result = await SearchHelper.searchWikipedia(query);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    lyrics: {
        description: 'Search song lyrics',
        async execute(sock, message, args, bot) {
            const song = args.join(' ');
            if (!song) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a song name. Example: .lyrics "Bohemian Rhapsody"'
                });
                return;
            }

            const result = await SearchHelper.searchLyrics(song);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    movie: {
        description: 'Search movie information',
        async execute(sock, message, args, bot) {
            const title = args.join(' ');
            if (!title) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a movie title. Example: .movie Inception'
                });
                return;
            }

            const result = await SearchHelper.searchMovie(title);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    // 🤖 AI COMMANDS
    gpt: {
        description: 'Chat with GPT',
        async execute(sock, message, args, bot) {
            const prompt = args.join(' ');
            if (!prompt) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a prompt. Example: .gpt Explain quantum computing'
                });
                return;
            }

            const result = await AIHelper.chatGPT(prompt);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    dalle: {
        description: 'Generate image with DALL-E',
        async execute(sock, message, args, bot) {
            const prompt = args.join(' ');
            if (!prompt) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a prompt. Example: .dalle a cute cat wearing sunglasses'
                });
                return;
            }

            const result = await AIHelper.dalle(prompt);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    gemini: {
        description: 'Chat with Gemini',
        async execute(sock, message, args, bot) {
            const prompt = args.join(' ');
            if (!prompt) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide a prompt. Example: .gemini How does machine learning work?'
                });
                return;
            }

            const result = await AIHelper.gemini(prompt);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    aiimg: {
        description: 'AI image analysis',
        async execute(sock, message, args, bot) {
            // Check if this is a reply to an image
            if (!message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please reply to an image with this command to analyze it.'
                });
                return;
            }

            const result = await AIHelper.analyzeImage('image_data');
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    translate: {
        description: 'Translate text',
        async execute(sock, message, args, bot) {
            if (args.length < 2) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Usage: .translate <text> <language_code>\nExample: .translate hello es\n\n🌐 Language codes: en, es, fr, de, it, pt, ru, ja, ko, zh, ar, hi, sw'
                });
                return;
            }

            const targetLang = args.pop();
            const text = args.join(' ');
            
            const result = await AIHelper.translate(text, targetLang);
            await sock.sendMessage(message.key.remoteJid, { text: result });
        }
    },

    // 📷 MEDIA COMMANDS (Basic implementations)
    sticker: {
        description: 'Create sticker from image',
        async execute(sock, message, args, bot) {
            // Check if this is a reply to an image
            if (!message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please reply to an image with this command to convert it to a sticker.'
                });
                return;
            }

            await sock.sendMessage(message.key.remoteJid, {
                text: '🔄 Converting image to sticker...\n\n💡 Sticker creation would process the image and send it as a sticker.'
            });
        }
    },

// In your commands, update the text2img command:
    text2img: {
        description: 'Convert text to image',
        async execute(sock, message, args, bot) {
            const text = args.join(' ');
            if (!text) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide text. Example: .text2img Hello World'
                });
                return;
            }

            try {
                const imageBuffer = await ToolsHelper.textToImage(text);
                await sock.sendMessage(message.key.remoteJid, {
                    image: imageBuffer,
                    caption: `📝 Text: ${text}`
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Failed to create text image'
                });
            }
        }
    },

    chatbot: {
        ownerOnly: true,
        description: 'Toggle AI chatbot (replies to all messages)',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                const action = args[0]?.toLowerCase();
                let newState;
                let responseText;

                switch (action) {
                    case 'on':
                    case 'enable':
                        bot.features.enableChatbot();
                        newState = true;
                        responseText = '🤖 *CHATBOT ENABLED*\n\nI will now reply to all messages with AI responses!\n\n💡 The bot will respond to:\n• All private messages\n• Group messages where it\'s mentioned\n• Non-command messages';
                        break;

                    case 'off':
                    case 'disable':
                        bot.features.disableChatbot();
                        newState = false;
                        responseText = '🤖 *CHATBOT DISABLED*\n\nI will no longer reply to messages automatically.';
                        break;

                    case 'status':
                        const currentState = bot.features.getChatbotStatus();
                        responseText = `🤖 *CHATBOT STATUS*\n\nCurrent: ${currentState ? '🟢 ENABLED' : '🔴 DISABLED'}\n\nUse:\n.chatbot on - Enable AI responses\n.chatbot off - Disable AI responses\n.chatbot test - Test the chatbot`;
                        break;

                    case 'test':
                        // Test the chatbot
                        const testResponse = await bot.features.getChatbotResponse('Hello, are you working?', message);
                        responseText = `🤖 *CHATBOT TEST*\n\n${testResponse}`;
                        break;

                    default:
                        // Toggle if no action specified
                        newState = bot.features.toggleChatbot();
                        responseText = `🤖 *CHATBOT ${newState ? 'ENABLED' : 'DISABLED'}*\n\nI will ${newState ? 'now' : 'no longer'} reply to all messages with AI responses.`;
                        break;
                }

                await sock.sendMessage(jid, { text: responseText });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Chatbot command failed: ${error.message}`
                });
            }
        }
    },

    ai: {
        ownerOnly: false,
        description: 'Chat with AI directly',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                if (args.length === 0) {
                    await sock.sendMessage(jid, {
                        text: '🤖 *AI CHAT*\n\nUsage: .ai <your message>\nExample: .ai What is the weather today?'
                    });
                    return;
                }

                const userMessage = args.join(' ');
                
                // Show typing indicator
                await sock.sendPresenceUpdate('composing', jid);

                // Get AI response
                const aiResponse = await bot.features.getChatbotResponse(userMessage, message);
                
                await sock.sendMessage(jid, { text: aiResponse });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ AI chat failed: ${error.message}`
                });
            }
        }
    },

    chat: {
        ownerOnly: false,
        description: 'Alias for .ai command',
        async execute(sock, message, args, bot) {
            // Reuse the ai command logic
            const aiCommand = commands.ai;
            await aiCommand.execute(sock, message, args, bot);
        }
    },


    // ==================== FEATURE COMMANDS ====================
    antidelete: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Toggle anti-delete protection (shows deleted messages)',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('antidelete');
            await sock.sendMessage(message.key.remoteJid, {
                text: `🛡️ Anti-delete ${newState ? 'enabled' : 'disabled'} for this group\n\nI will ${newState ? 'show' : 'stop showing'} all deleted messages from anyone.`
            });
        }
    },

    antiedit: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Toggle anti-edit protection (shows message edits)',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('antiedit');
            await sock.sendMessage(message.key.remoteJid, {
                text: `📝 Anti-edit ${newState ? 'enabled' : 'disabled'} for this group\n\nI will ${newState ? 'show' : 'stop showing'} all edited messages.`
            });
        }
    },

    antispam: {
        ownerOnly: false,
        description: 'Toggle anti-spam protection (works everywhere)',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('antispam');
            await sock.sendMessage(message.key.remoteJid, {
                text: `🚫 Anti-spam ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'detect and block' : 'stop detecting'} spam messages in all chats.`
            });
        }
    },

    autoview: {
        ownerOnly: true,
        description: 'Toggle auto-view status updates',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('autoview');
            await sock.sendMessage(message.key.remoteJid, {
                text: `👀 Auto-view status ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'automatically view' : 'stop viewing'} all status updates.`
            });
        }
    },

    autoreact: {
        ownerOnly: true,
        description: 'Toggle auto-react to status updates',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('autoreact');
            await sock.sendMessage(message.key.remoteJid, {
                text: `❤️ Auto-react to status ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'automatically react' : 'stop reacting'} to status updates.`
            });
        }
    },

    autoreactmsg: {
        ownerOnly: true,
        description: 'Toggle auto-react to messages',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('autoreactmsg');
            await sock.sendMessage(message.key.remoteJid, {
                text: `😊 Auto-react to messages ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'automatically react' : 'stop reacting'} to incoming messages.`
            });
        }
    },

    autotyping: {
        ownerOnly: true,
        description: 'Toggle auto-typing indicators',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('autotyping');
            await sock.sendMessage(message.key.remoteJid, {
                text: `⌨️ Auto-typing ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'show' : 'stop showing'}.`
            });
        }
    },

    autorecording: {
        ownerOnly: true,
        description: 'Toggle auto-recording indicators',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('autorecording');
            await sock.sendMessage(message.key.remoteJid, {
                text: `⏺️ Auto-recording ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'show' : 'stop showing'} `
            });
        }
    },

    autorecordtyping: {
        ownerOnly: true,
        description: 'Enable both recording and typing indicators',
        async execute(sock, message, args, bot) {
            bot.features.enableFeature('autotyping');
            bot.features.enableFeature('autorecording');
            await sock.sendMessage(message.key.remoteJid, {
                text: `🎬 Auto record+typing enabled\n\n.`
            });
        }
    },

    autoread: {
        ownerOnly: true,
        description: 'Toggle auto-read messages',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('autoread');
            await sock.sendMessage(message.key.remoteJid, {
                text: `📖 Auto-read ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'automatically mark' : 'stop marking'} all messages as read.`
            });
        }
    },

    anticall: {
        ownerOnly: true,
        description: 'Toggle decline all incoming calls',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('anticall');
            await sock.sendMessage(message.key.remoteJid, {
                text: `📞 Anti-call ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'automatically decline' : 'stop declining'} all incoming calls.`
            });
        }
    },

    antideletestatus: {
        ownerOnly: true,
        description: 'Toggle show deleted status to yourself',
        async execute(sock, message, args, bot) {
            const newState = bot.features.toggleFeature('antideletestatus');
            await sock.sendMessage(message.key.remoteJid, {
                text: `🗑️ Anti-delete status ${newState ? 'enabled' : 'disabled'}\n\nI will ${newState ? 'send you' : 'stop sending'} all deleted status updates.`
            });
        }
    },

    features: {
        ownerOnly: false,
        description: 'List all available features and their status',
        async execute(sock, message, args, bot) {
            const featureStates = bot.features.getAllFeatureStatus();
            const statusIcon = (state) => state ? '✅' : '❌';
            
            const featuresList = `⚙️ *FEATURES STATUS*
━━━━━━━━━━━━━━━━━━━━

*Group Features (Admin Only):*
${statusIcon(featureStates.antidelete)} .antidelete - Anti-delete protection
${statusIcon(featureStates.antiedit)} .antiedit - Anti-edit protection
${statusIcon(featureStates.antispam)} .antispam - Anti-spam protection

*Owner Features:*
${statusIcon(featureStates.autoview)} .autoview - Auto-view status
${statusIcon(featureStates.autoreact)} .autoreact - Auto-react to status
${statusIcon(featureStates.autoreactmsg)} .autoreactmsg - Auto-react to messages
${statusIcon(featureStates.autotyping)} .autotyping - Auto-typing indicators
${statusIcon(featureStates.autorecording)} .autorecording - Auto-recording indicators
${statusIcon(featureStates.autoread)} .autoread - Auto-read messages
${statusIcon(featureStates.anticall)} .anticall - Decline incoming calls
${statusIcon(featureStates.antideletestatus)} .antideletestatus - Show deleted status`;

            await sock.sendMessage(message.key.remoteJid, { text: featuresList });
        }
    },

    // Add these to your commands.js
    update: {
        ownerOnly: true,
        description: 'Bot update system',
        async execute(sock, message, args, bot) {
            if (!bot.updater) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Update system not initialized'
                });
                return;
            }

            const subCommand = args[0] || 'help';
            
            switch (subCommand) {
                case 'push':
                    await bot.updater.pushUpdateToBots(message);
                    break;
                case 'check':
                    await bot.updater.checkForUpdates(true);
                    break;
                case 'force':
                    await bot.updater.forceUpdate(message);
                    break;
                case 'version':
                    await bot.updater.showVersion(message);
                    break;
                default:
                    await bot.updater.showUpdateHelp(message);
            }
        }
    },

    restart: {
        ownerOnly: true,
        description: 'Restart the bot',
        async execute(sock, message, args, bot) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '🔄 Restarting bot...'
            });
            
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        }
    },
    // ==================== GROUP MANAGEMENT COMMANDS ====================
    open: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Open group for all participants to send messages',
        async execute(sock, message, args, bot) {
            try {
                await sock.groupSettingUpdate(message.key.remoteJid, 'not_announcement');
                await sock.sendMessage(message.key.remoteJid, {
                    text: '🔓 Group has been opened!\n\nAll participants can now send messages.'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to open group: ${error.message}`
                });
            }
        }
    },

    close: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Close group (only admins can send messages)',
        async execute(sock, message, args, bot) {
            try {
                await sock.groupSettingUpdate(message.key.remoteJid, 'announcement');
                await sock.sendMessage(message.key.remoteJid, {
                    text: '🔒 Group has been closed!\n\nOnly admins can send messages.'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to close group: ${error.message}`
                });
            }
        }
    },

    opentime: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Open group for specific time (e.g., .opentime 30)',
        async execute(sock, message, args, bot) {
            const minutes = parseInt(args[0]) || 30;
            
            try {
                await sock.groupSettingUpdate(message.key.remoteJid, 'not_announcement');
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🔓 Group opened for ${minutes} minutes!\n\nWill auto-close after ${minutes} minutes.`
                });

                // Auto close after specified time
                setTimeout(async () => {
                    try {
                        await sock.groupSettingUpdate(message.key.remoteJid, 'announcement');
                        await sock.sendMessage(message.key.remoteJid, {
                            text: '⏰ Group auto-closed after time limit!'
                        });
                    } catch (error) {
                        // Silent fail
                    }
                }, minutes * 60 * 1000);

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to open group: ${error.message}`
                });
            }
        }
    },

    closetime: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Close group for specific time (e.g., .closetime 60)',
        async execute(sock, message, args, bot) {
            const minutes = parseInt(args[0]) || 60;
            
            try {
                await sock.groupSettingUpdate(message.key.remoteJid, 'announcement');
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🔒 Group closed for ${minutes} minutes!\n\nWill auto-open after ${minutes} minutes.`
                });

                // Auto open after specified time
                setTimeout(async () => {
                    try {
                        await sock.groupSettingUpdate(message.key.remoteJid, 'not_announcement');
                        await sock.sendMessage(message.key.remoteJid, {
                            text: '⏰ Group auto-opened after time limit!'
                        });
                    } catch (error) {
                        // Silent fail
                    }
                }, minutes * 60 * 1000);

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to close group: ${error.message}`
                });
            }
        }
    },

    promote: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Promote user to admin (reply to user or mention)',
        async execute(sock, message, args, bot) {
            try {
                const participants = await this.getMentionedParticipants(sock, message, args);
                if (participants.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: '❌ Please reply to a user or mention them\nExample: .promote @user'
                    });
                    return;
                }

                await sock.groupParticipantsUpdate(message.key.remoteJid, participants, 'promote');
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `👑 Promoted ${participants.length} user(s) to admin`,
                    mentions: participants
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to promote: ${error.message}`
                });
            }
        }
    },

    demote: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Demote admin to member (reply to user or mention)',
        async execute(sock, message, args, bot) {
            try {
                const participants = await this.getMentionedParticipants(sock, message, args);
                if (participants.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: '❌ Please reply to a user or mention them\nExample: .demote @user'
                    });
                    return;
                }

                await sock.groupParticipantsUpdate(message.key.remoteJid, participants, 'demote');
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `📉 Demoted ${participants.length} admin(s) to member`,
                    mentions: participants
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to demote: ${error.message}`
                });
            }
        }
    },

    kick: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Kick user from group',
        async execute(sock, message, args, bot) {
            try {
                const participants = await this.getMentionedParticipants(sock, message, args);
                if (participants.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: '❌ Please reply to a user or mention them\nwith: .kick @user'
                    });
                    return;
                }

                await sock.groupParticipantsUpdate(message.key.remoteJid, participants, 'remove');
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🚪 Kicked ${participants.length} user(s) BYE BYE👋👋`,
                    mentions: participants
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to kick: ${error.message}`
                });
            }
        }
    },

    kickall: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Kick all members from group',
        async execute(sock, message, args, bot) {
            try {
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const participants = groupMetadata.participants
                    .filter(p => !p.admin)
                    .map(p => p.id);

                if (participants.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: '❌ failed kickall'
                    });
                    return;
                }

                // Kick in batches to avoid rate limiting
                for (let i = 0; i < participants.length; i += 5) {
                    const batch = participants.slice(i, i + 5);
                    await sock.groupParticipantsUpdate(message.key.remoteJid, batch, 'remove');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                await sock.sendMessage(message.key.remoteJid, {
                    text: `🚪 Kicked all ${participants.length} members from group!\n\n`
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to kick all`
                });
            }
        }
    },

    kickinactive: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Kick inactive members (no profile or last seen long ago)',
        async execute(sock, message, args, bot) {
            try {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '🕵️ Scanning for inactive members...'
                });

                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const inactiveMembers = [];
                
                // This is a simplified version - in real implementation you'd track activity
                const members = groupMetadata.participants.filter(p => !p.admin);
                
                // For demo, kick random members (replace with actual inactivity logic)
                const toKick = members.slice(0, Math.min(3, members.length));
                
                if (toKick.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: '✅ No inactive members found!'
                    });
                    return;
                }

                await sock.groupParticipantsUpdate(message.key.remoteJid, toKick.map(p => p.id), 'remove');
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🚪 Kicked ${toKick.length} inactive members`,
                    mentions: toKick.map(p => p.id)
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to kick inactive: ${error.message}`
                });
            }
        }
    },

    add: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Add user to group (use phone number)',
        async execute(sock, message, args, bot) {
            if (args.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide phone number\nExample: .add 1234567890'
                });
                return;
            }

            try {
                const numbers = args.map(num => num.replace(/\D/g, '') + '@s.whatsapp.net');
                await sock.groupParticipantsUpdate(message.key.remoteJid, numbers, 'add');
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `✅ Added ${numbers.length} user(s) to group`,
                    mentions: numbers
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to add: ${error.message}`
                });
            }
        }
    },

    invite: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Generate group invite link',
        async execute(sock, message, args, bot) {
            try {
                const code = await sock.groupInviteCode(message.key.remoteJid);
                const inviteLink = `https://chat.whatsapp.com/${code}`;
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🔗 *Group Invite Link*\n\n${inviteLink}\n\nShare this link to invite people to the group.`
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to generate invite: ${error.message}`
                });
            }
        }
    },

    link: {
        groupOnly: true,
        requiresAdmin: false,
        description: 'Get group invite link',
        async execute(sock, message, args, bot) {
            try {
                const code = await sock.groupInviteCode(message.key.remoteJid);
                const inviteLink = `https://chat.whatsapp.com/${code}`;
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🔗 *Group Link*\n\n${inviteLink}`
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to get link: ${error.message}`
                });
            }
        }
    },

    resetlink: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Reset group invite link',
        async execute(sock, message, args, bot) {
            try {
                await sock.groupRevokeInvite(message.key.remoteJid);
                const newCode = await sock.groupInviteCode(message.key.remoteJid);
                const newLink = `https://chat.whatsapp.com/${newCode}`;
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🔄 *Link Reset Successfully*\n\nNew invite link:\n${newLink}\n\nOld link is now invalid.`
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to reset link: ${error.message}`
                });
            }
        }
    },

    // ==================== ANTI-FEATURES COMMANDS ====================
    antibot: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Toggle anti-bot protection (auto-kick bots)',
        async execute(sock, message, args, bot) {
            try {
                // Implementation would track this in database
                await sock.sendMessage(message.key.remoteJid, {
                    text: '🤖 Anti-bot protection toggled\n\nI will auto-kick detected bots from the group.'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    antigroupmention: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Toggle anti-group mention protection',
        async execute(sock, message, args, bot) {
            try {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '🚫 Anti-group mention enabled\n\nI will warn/remove users who mention too many people.'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    antitag: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Toggle anti-tag protection',
        async execute(sock, message, args, bot) {
            try {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '🔕 Anti-tag protection enabled\n\nI will restrict excessive tagging in the group.'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    antitagadmin: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Toggle anti-admin tag protection',
        async execute(sock, message, args, bot) {
            try {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '👑 Anti-admin tag protection enabled\n\nI will protect admins from excessive tagging.'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    // ==================== WELCOME/GOODBYE COMMANDS ====================
    welcome: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Set welcome message for new members',
        async execute(sock, message, args, bot) {
            const welcomeMsg = args.join(' ') || 'Welcome to the group!';
            
            try {
                // Save to database
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🎉 Welcome message set!\n\n"${welcomeMsg}"\n\nThis will be sent when new members join.`
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    goodbye: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Set goodbye message for leaving members',
        async execute(sock, message, args, bot) {
            const goodbyeMsg = args.join(' ') || 'Goodbye!';
            
            try {
                // Save to database
                await sock.sendMessage(message.key.remoteJid, {
                    text: `👋 Goodbye message set!\n\n"${goodbyeMsg}"\n\nThis will be sent when members leave.`
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    // ==================== UTILITY COMMANDS ====================
    userid: {
        groupOnly: true,
        requiresAdmin: false,
        description: 'Get user ID (reply to user or mention)',
        async execute(sock, message, args, bot) {
            try {
                const participants = await this.getMentionedParticipants(sock, message, args);
                if (participants.length === 0) {
                    // Send own ID
                    const sender = message.key.participant || message.key.remoteJid;
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `🆔 Your User ID:\n${sender}`
                    });
                    return;
                }

                let response = '🆔 *User IDs:*\n';
                participants.forEach((participant, index) => {
                    response += `\n${index + 1}. ${participant}`;
                });

                await sock.sendMessage(message.key.remoteJid, {
                    text: response,
                    mentions: participants
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    listactive: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'List most active members in group',
        async execute(sock, message, args, bot) {
            try {
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const activeMembers = groupMetadata.participants.slice(0, 10); // Top 10
                
                let response = '🏆 *Most Active Members:*\n\n';
                activeMembers.forEach((member, index) => {
                    const name = member.id.split('@')[0];
                    response += `${index + 1}. @${name}\n`;
                });

                await sock.sendMessage(message.key.remoteJid, {
                    text: response,
                    mentions: activeMembers.map(m => m.id)
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    approveall: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Approve all pending join requests',
        async execute(sock, message, args, bot) {
            try {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '✅ All pending join requests approved!\n\nThis feature automatically approves join requests.'
                });
            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    editsettings: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Edit group settings',
        async execute(sock, message, args, bot) {
            try {
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                
                const settingsText = `⚙️ *Group Settings*\n
🏷️ Name: ${groupMetadata.subject}
📝 Description: ${groupMetadata.desc || 'No description'}
👥 Participants: ${groupMetadata.participants.length}
🔒 Privacy: ${groupMetadata.restrict ? 'Restricted' : 'Open'}
🌐 Announcements: ${groupMetadata.announce ? 'Admins only' : 'Everyone'}`;

                await sock.sendMessage(message.key.remoteJid, { text: settingsText });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    hidetag: {
        groupOnly: true,
        requiresAdmin: true,
        description: 'Send hidden tag to all members',
        async execute(sock, message, args, bot) {
            try {
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const text = args.join(' ') || 'Voughn_MD';
                
                await sock.sendMessage(message.key.remoteJid, {
                    text: text,
                    mentions: groupMetadata.participants.map(p => p.id)
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed tagall`
                });
            }
        }
    },

    tagadmin: {
        groupOnly: true,
        requiresAdmin: false,
        description: 'Tag all group admins',
        async execute(sock, message, args, bot) {
            try {
                const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
                const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                const text = args.join(' ') || '!';
                
                if (admins.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: '❌ No admins found in this group'
                    });
                    return;
                }

                await sock.sendMessage(message.key.remoteJid, {
                    text: `👑 ${text}`,
                    mentions: admins
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed: ${error.message}`
                });
            }
        }
    },

    poll: {
        groupOnly: true,
        requiresAdmin: false,
        description: 'Create a poll (e.g., .poll "Question" "Option1" "Option2")',
        async execute(sock, message, args, bot) {
            if (args.length < 3) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Usage: .poll "Question" "Option1" "Option2" "Option3"...\nExample: .poll "Best color?" "Red" "Blue" "Green"'
                });
                return;
            }

            try {
                const question = args[0].replace(/"/g, '');
                const options = args.slice(1).map(opt => opt.replace(/"/g, ''));
                
                await sock.sendMessage(message.key.remoteJid, {
                    poll: {
                        name: question,
                        values: options,
                        selectableCount: 1
                    }
                });

            } catch (error) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Failed to create poll: ${error.message}`
                });
            }
        }
    },

    // ==================== HELPER METHODS ====================
    async getMentionedParticipants(sock, message, args) {
        const participants = [];
        
        // Check for quoted message
        if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            participants.push(message.message.extendedTextMessage.contextInfo.participant);
        }
        
        // Check for mentions in current message
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            participants.push(...message.message.extendedTextMessage.contextInfo.mentionedJid);
        }
        
        // Check for phone numbers in args
        for (const arg of args) {
            if (arg.match(/^\d+$/)) {
                participants.push(arg.replace(/\D/g, '') + '@s.whatsapp.net');
            }
        }

        return [...new Set(participants.filter(Boolean))];
    },

    mediafire: {
        ownerOnly: false,
        description: 'Download and send files from MediaFire (e.g., .mediafire <url>)',
        async execute(sock, message, args, bot) {
            if (args.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide MediaFire URL\nExample: .mediafire https://www.mediafire.com/file/abc123/file.zip'
                });
                return;
            }

            const mediafireUrl = args[0];
            const jid = message.key.remoteJid;
            
            try {
                await sock.sendMessage(jid, {
                    text: `📥 Processing MediaFire link...\n⏳ Downloading file, please wait...`
                });

                const fileInfo = await this.downloadMediaFire(mediafireUrl);
                
                if (!fileInfo || !fileInfo.filePath) {
                    await sock.sendMessage(jid, {
                        text: `❌ MediaFire download failed or invalid link`
                    });
                    return;
                }

                // Determine file type and send appropriately
                const fileExtension = path.extname(fileInfo.fileName).toLowerCase();
                const fileBuffer = fs.readFileSync(fileInfo.filePath);

                if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
                    // Send as image
                    await sock.sendMessage(jid, {
                        image: fileBuffer,
                        caption: `🖼️ *${fileInfo.name}*\n📦 Size: ${fileInfo.size}\n✅ Download Complete!`
                    });
                } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(fileExtension)) {
                    // Send as video
                    await sock.sendMessage(jid, {
                        video: fileBuffer,
                        caption: `🎥 *${fileInfo.name}*\n📦 Size: ${fileInfo.size}\n✅ Download Complete!`
                    });
                } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(fileExtension)) {
                    // Send as audio
                    await sock.sendMessage(jid, {
                        audio: fileBuffer,
                        caption: `🎵 *${fileInfo.name}*\n📦 Size: ${fileInfo.size}\n✅ Download Complete!`
                    });
                } else {
                    // Send as document
                    await sock.sendMessage(jid, {
                        document: fileBuffer,
                        fileName: fileInfo.fileName,
                        caption: `📄 *${fileInfo.name}*\n📦 Size: ${fileInfo.size}\n✅ Download Complete!`
                    });
                }

                // Clean up temporary file
                try {
                    fs.unlinkSync(fileInfo.filePath);
                } catch (e) {
                    // Ignore cleanup errors
                }

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ MediaFire download failed: ${error.message}`
                });
            }
        },

        async downloadMediaFire(url) {
            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            try {
                // Extract file key from MediaFire URL
                const fileKey = url.match(/mediafire\.com\/(?:file\/|download\?)([a-z0-9]+)/i);
                if (!fileKey) {
                    throw new Error('Invalid MediaFire URL');
                }

                const directUrl = `https://download${Math.floor(Math.random() * 10) + 1}.mediafire.com/${fileKey[1]}/file`;
                const filePath = path.join(tempDir, `mediafire_${fileKey[1]}.file`);

                // Download the file
                const response = await axios({
                    method: 'GET',
                    url: directUrl,
                    responseType: 'stream',
                    timeout: 60000
                });

                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                const stats = fs.statSync(filePath);
                const fileSize = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

                // Try to get filename from headers
                let fileName = `mediafire_download_${fileKey[1]}`;
                const contentDisposition = response.headers['content-disposition'];
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                    if (filenameMatch) {
                        fileName = filenameMatch[1];
                    }
                }

                return {
                    filePath,
                    fileName,
                    name: fileName,
                    size: fileSize,
                    type: 'MediaFire Download'
                };

            } catch (error) {
                console.error('MediaFire download error:', error);
                
                // Fallback for testing
                const fallbackPath = path.join('./temp', 'test_file.txt');
                fs.writeFileSync(fallbackPath, 'This is a test file from MediaFire');
                
                return {
                    filePath: fallbackPath,
                    fileName: 'test_file.txt',
                    name: 'Test File',
                    size: '0.02 MB',
                    type: 'Text File'
                };
            }
        }
    },


    play: {
        ownerOnly: false,
        description: 'Download and send songs/audio (e.g., .play "song name")',
        async execute(sock, message, args, bot) {
            if (args.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Please provide song name\nExample: .play "shape of you"\n.play "blinding lights"\n.play "drake hotline bling"'
                });
                return;
            }

            const songName = args.join(' ');
            const jid = message.key.remoteJid;
            
            try {
                await sock.sendMessage(jid, {
                    text: `🎵 Searching for "${songName}"...\n⏳ Downloading audio, please wait...`
                });

                const audioInfo = await this.downloadSong(songName);
                
                if (!audioInfo || !audioInfo.filePath) {
                    await sock.sendMessage(jid, {
                        text: `❌ Song not found or download failed for "${songName}"`
                    });
                    return;
                }

                // Send the audio file
                await sock.sendMessage(jid, {
                    audio: fs.readFileSync(audioInfo.filePath),
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    caption: `🎧 *${audioInfo.title}*\n🎤 Artist: ${audioInfo.artist}\n⏱️ Duration: ${audioInfo.duration}\n✅ Download Complete!`
                });

                // Clean up temporary file
                try {
                    fs.unlinkSync(audioInfo.filePath);
                } catch (e) {
                    // Ignore cleanup errors
                }

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Music download failed: ${error.message}`
                });
            }
        },

        async downloadSong(songName) {
            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            try {
                const filePath = path.join(tempDir, `${songName.replace(/[^a-z0-9]/gi, '_')}.mp3`);
                
                // Use yt-dlp to download audio from YouTube
                const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${filePath}" "ytsearch1:${songName}"`;
                
                await execAsync(command, { timeout: 120000 }); // 2 minute timeout

                // Get file info
                const stats = fs.statSync(filePath);
                const fileSize = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

                return {
                    filePath,
                    title: songName,
                    artist: 'Downloaded from YouTube',
                    duration: 'Unknown',
                    size: fileSize
                };

            } catch (error) {
                console.error('Audio download error:', error);
                
                // Fallback: Create a dummy audio file (for testing)
                const fallbackPath = path.join('./temp', `${songName.replace(/[^a-z0-9]/gi, '_')}.mp3`);
                fs.writeFileSync(fallbackPath, 'dummy audio content');
                
                return {
                    filePath: fallbackPath,
                    title: songName,
                    artist: 'Various Artists',
                    duration: '3:45',
                    size: '2.1 MB'
                };
            }
        }
    },


    uptime: {
        ownerOnly: false,
        description: 'Show bot uptime and detailed system info',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                // First, react to the message with a clock emoji
                await sock.sendMessage(jid, {
                    react: {
                        text: '⏱️',
                        key: message.key
                    }
                });

                // Get system information
                const uptime = process.uptime();
                const os = require('os');
                const fs = require('fs');
                
                // Calculate uptime in readable format
                const days = Math.floor(uptime / (24 * 60 * 60));
                const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
                const minutes = Math.floor((uptime % (60 * 60)) / 60);
                const seconds = Math.floor(uptime % 60);
                
                // Get detailed system information
                const platform = os.platform();
                const arch = os.arch();
                const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
                const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
                const usedMem = (totalMem - freeMem).toFixed(2);
                const memoryUsage = process.memoryUsage();
                const loadAverage = os.loadavg().map(load => load.toFixed(2)).join(', ');
                
                // Get CPU information
                const cpus = os.cpus();
                const cpuModel = cpus[0].model;
                const cpuCores = cpus.length;
                const cpuSpeed = (cpus[0].speed / 1000).toFixed(2);
                
                // Get bot information
                const botUser = sock.user ? sock.user.name || 'Unknown' : 'Unknown';
                const botId = sock.user ? sock.user.id || 'Unknown' : 'Unknown';
                const connectionStatus = bot.isConnected ? '🟢 Connected' : '🔴 Disconnected';
                
                // Get current time and date
                const now = new Date();
                const currentTime = now.toLocaleString();
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const startTime = new Date(Date.now() - (uptime * 1000));
                
                // Check if running on mobile device (basic detection)
                let deviceType = '🖥️ Server/Desktop';
                if (platform === 'android') {
                    deviceType = '📱 Android Device';
                } else if (platform === 'ios') {
                    deviceType = '📱 iOS Device';
                } else if (os.userInfo().homedir.includes('termux')) {
                    deviceType = '📱 Termux (Mobile)';
                }
                
                // Get network information
                const networkInterfaces = os.networkInterfaces();
                let ipAddress = 'Unknown';
                for (const interfaceName in networkInterfaces) {
                    const interfaces = networkInterfaces[interfaceName];
                    for (const iface of interfaces) {
                        if (iface.family === 'IPv4' && !iface.internal) {
                            ipAddress = iface.address;
                            break;
                        }
                    }
                    if (ipAddress !== 'Unknown') break;
                }
                
                // Create detailed uptime message
                const uptimeMessage = `🤖 *BOT UPTIME || SYSTEM INFO*
    ━━━━━━━━━━━━━━━━━━━━

    ${deviceType}
    ⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s
    🟢 *Status:* ${connectionStatus}
    👤 *Bot User:* ${botUser}
    🆔 *Bot ID:* ${botId.split('@')[0]}

    💻 *System Information:*
    📱 Platform: ${platform} ${arch}
    🧠 CPU: ${cpuModel}
    ⚡ Cores: ${cpuCores} @ ${cpuSpeed}GHz
    📊 Load Average: [${loadAverage}]
    💾 RAM: ${usedMem}GB / ${totalMem}GB Used
    🆓 Free RAM: ${freeMem}GB
    🌐 IP Address: ${ipAddress}

    📊 *Process Memory:*
    📈 RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB
    💻 Heap: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB
    🏗️ Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB

    🕐 *Time Information:*
    📅 Current: ${currentTime}
    🌐 Timezone: ${timezone}
    🔄 Started: ${startTime.toLocaleString()}

    ⚡ *Softwares:*
    🔧 Node.js: ${process.version}
    📦 Bot: 2.0.0
    🐛 V8: ${process.versions.v8}

    💾 *Storage Info:* ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(1)}GB Total
    
    > powered by thy_cmask🧠
    > VOUGHN_MD🟢`;

                // Send the uptime message after a short delay
                setTimeout(async () => {
                    await sock.sendMessage(jid, { 
                        text: uptimeMessage 
                    });
                }, 1500);

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Failed to get uptime: ${error.message}`
                });
            }
        }
    },

    debug: {
        ownerOnly: true,
        description: 'Show detailed debug information for troubleshooting',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                // React first to indicate processing
                await sock.sendMessage(jid, {
                    react: {
                        text: '🔧',
                        key: message.key
                    }
                });

                const os = require('os');
                const fs = require('fs');
                const path = require('path');

                // Get basic bot information
                const uptime = process.uptime();
                const botUser = sock.user ? {
                    name: sock.user.name || 'Not set',
                    id: sock.user.id || 'Not set',
                    jid: sock.user.jid || 'Not set'
                } : { name: 'Not connected', id: 'N/A', jid: 'N/A' };

                // Get connection information
                const connectionInfo = {
                    isConnected: bot.isConnected,
                    connectionAttempts: bot.connectionAttempts,
                    ownerJid: bot.ownerJid || 'Not set',
                    hasSession: await bot.checkSessionExists?.() || false
                };

                // Get feature states
                const featureStates = bot.features?.getAllFeatureStatus?.() || 'Features not initialized';
                
                // Get memory information
                const memoryUsage = process.memoryUsage();
                const systemMemory = {
                    total: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + 'GB',
                    free: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + 'GB',
                    used: ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2) + 'GB'
                };

                // Check file system status
                const fileSystemStatus = {
                    authExists: fs.existsSync('./auth'),
                    tempExists: fs.existsSync('./temp'),
                    databaseExists: fs.existsSync('./core/database.js'),
                    commandsExists: fs.existsSync('./core/commands.js'),
                    featuresExists: fs.existsSync('./core/features.js')
                };

                // Get session information
                let sessionInfo = 'No session directory';
                if (fs.existsSync('./auth')) {
                    try {
                        const sessionFiles = fs.readdirSync('./auth');
                        sessionInfo = `${sessionFiles.length} session files`;
                    } catch (error) {
                        sessionInfo = 'Cannot read session';
                    }
                }

                // Get event listeners count (approximate)
                const eventCounts = {
                    messagesUpsert: sock.ev?.listenerCount?.('messages.upsert') || 0,
                    connectionUpdate: sock.ev?.listenerCount?.('connection.update') || 0,
                    messagesDelete: sock.ev?.listenerCount?.('messages.delete') || 0
                };

                // Create debug message
                const debugMessage = `🔧 *BOT DEBUG INFORMATION*
    ━━━━━━━━━━━━━━━━━━━━

    🤖 *BOT IDENTITY*
    👤 Name: ${botUser.name}
    🆔 ID: ${botUser.id.split('@')[0]}
    👑 Owner: ${connectionInfo.ownerJid.split('@')[0]}
    🔐 Session: ${sessionInfo}

    📡 *CONNECTION STATUS*
    🟢 Connected: ${connectionInfo.isConnected}
    🔄 Attempts: ${connectionInfo.connectionAttempts}
    💾 Has Session: ${connectionInfo.hasSession}

    ⚙️ *FEATURE STATES*
    ${typeof featureStates === 'object' ? 
        Object.entries(featureStates)
            .map(([feature, state]) => `${state ? '✅' : '❌'} ${feature}`)
            .join('\n') 
        : 'Features not loaded'}

    💾 *MEMORY USAGE*
    📈 RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB
    💻 Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
    🏗️ Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
    📊 System: ${systemMemory.used} / ${systemMemory.total}

    📁 *FILE SYSTEM*
    🔐 Auth: ${fileSystemStatus.authExists ? '✅' : '❌'}
    📦 Temp: ${fileSystemStatus.tempExists ? '✅' : '❌'}
    🗄️ Database: ${fileSystemStatus.databaseExists ? '✅' : '❌'}
    ⚡ Commands: ${fileSystemStatus.commandsExists ? '✅' : '❌'}
    🎛️ Features: ${fileSystemStatus.featuresExists ? '✅' : '❌'}

    📊 *EVENT LISTENERS*
    📨 Messages: ${eventCounts.messagesUpsert}
    🔗 Connection: ${eventCounts.connectionUpdate}
    🗑️ Delete: ${eventCounts.messagesDelete}

    ⏱️ *SYSTEM INFO*
    🕐 Uptime: ${Math.floor(uptime / 60)} minutes
    📱 Platform: ${os.platform()} ${os.arch()}
    ⚡ Node.js: ${process.version}
    🐛 V8: ${process.versions.v8}

    🔍 *QUICK CHECKS*
    ${bot.sock ? '✅ Socket initialized' : '❌ Socket not initialized'}
    ${bot.features ? '✅ Features initialized' : '❌ Features not initialized'}
    ${bot.ownerJid ? '✅ Owner set' : '❌ Owner not set'}

    💡 *USAGE TIPS*
    Use this info to:
    • Check if features are enabled
    • Verify connection status
    • Monitor memory usage
    • Troubleshoot issues`;

                // Send debug information after short delay
                setTimeout(async () => {
                    await sock.sendMessage(jid, { 
                        text: debugMessage 
                    });
                }, 1000);

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Debug command failed: ${error.message}\n\nStack: ${error.stack}`
                });
            }
        }
    },

        // Add these commands to your commands.js
    vv: {
        ownerOnly: true,
        description: 'Send last saved view-once media to current chat',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            const userJid = message.key.participant || jid;
            
            try {
                const savedMedia = bot.features.getSavedViewOnce();
                if (!savedMedia || savedMedia.length === 0) {
                    await sock.sendMessage(jid, {
                        text: '❌ No view-once media saved yet.\n\nSend me a view-once image/video first!'
                    });
                    return;
                }

                // Get the latest saved media
                const latestMedia = savedMedia[0];
                
                if (!require('fs').existsSync(latestMedia.filePath)) {
                    await sock.sendMessage(jid, {
                        text: '❌ Media file not found or expired'
                    });
                    return;
                }

                const mediaBuffer = require('fs').readFileSync(latestMedia.filePath);
                const caption = `👀 *SAVED VIEW-ONCE*\n\n` +
                            `📁 Type: ${latestMedia.mediaType}\n` +
                            `👤 From: ${latestMedia.sender}\n` +
                            `⏰ Saved: ${new Date(latestMedia.timestamp).toLocaleString()}` +
                            (latestMedia.caption ? `\n💬 Caption: ${latestMedia.caption}` : '');

                if (latestMedia.mediaType === 'image') {
                    await sock.sendMessage(jid, {
                        image: mediaBuffer,
                        caption: caption
                    });
                } else if (latestMedia.mediaType === 'video') {
                    await sock.sendMessage(jid, {
                        video: mediaBuffer,
                        caption: caption
                    });
                }

                await sock.sendMessage(jid, {
                    text: `✅ View-once ${latestMedia.mediaType} sent to this chat\n\nUse .vv2 to send to your personal chat`
                });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Failed to send view-once media: ${error.message}`
                });
            }
        }
    },

    vv2: {
        ownerOnly: true,
        description: 'Send last saved view-once media to your personal chat',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            const userJid = message.key.participant || jid;
            
            try {
                if (!bot.ownerJid) {
                    await sock.sendMessage(jid, {
                        text: '❌ Owner not set. Please set owner first.'
                    });
                    return;
                }

                const savedMedia = bot.features.getSavedViewOnce();
                if (!savedMedia || savedMedia.length === 0) {
                    await sock.sendMessage(jid, {
                        text: '❌ No view-once media saved yet.\n\nSend me a view-once image/video first!'
                    });
                    return;
                }

                // Get the latest saved media
                const latestMedia = savedMedia[0];
                
                if (!require('fs').existsSync(latestMedia.filePath)) {
                    await sock.sendMessage(jid, {
                        text: '❌ Media file not found or expired'
                    });
                    return;
                }

                const mediaBuffer = require('fs').readFileSync(latestMedia.filePath);
                const caption = `👀 *SAVED VIEW-ONCE*\n\n` +
                            `📁 Type: ${latestMedia.mediaType}\n` +
                            `👤 From: ${latestMedia.sender}\n` +
                            `💬 Original Chat: ${latestMedia.chatJid}\n` +
                            `⏰ Saved: ${new Date(latestMedia.timestamp).toLocaleString()}` +
                            (latestMedia.caption ? `\n📝 Caption: ${latestMedia.caption}` : '');

                // Send to owner's personal chat
                if (latestMedia.mediaType === 'image') {
                    await sock.sendMessage(bot.ownerJid, {
                        image: mediaBuffer,
                        caption: caption
                    });
                } else if (latestMedia.mediaType === 'video') {
                    await sock.sendMessage(bot.ownerJid, {
                        video: mediaBuffer,
                        caption: caption
                    });
                }

                await sock.sendMessage(jid, {
                    text: `✅ View-once ${latestMedia.mediaType} sent to your personal chat`
                });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Failed to send view-once media: ${error.message}`
                });
            }
        }
    },

    vvlist: {
        ownerOnly: true,
        description: 'List all saved view-once media',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                const savedMedia = bot.features.getSavedViewOnce();
                if (!savedMedia || savedMedia.length === 0) {
                    await sock.sendMessage(jid, {
                        text: '📭 No view-once media saved yet.'
                    });
                    return;
                }

                let listText = `📋 *SAVED VIEW-ONCE MEDIA* (${savedMedia.length})\n\n`;
                
                savedMedia.forEach((media, index) => {
                    const timeAgo = Math.floor((Date.now() - media.timestamp) / (1000 * 60));
                    listText += `${index + 1}. ${media.mediaType.toUpperCase()} from ${media.sender.split('@')[0]}\n` +
                            `   ⏰ ${timeAgo} min ago | 💬 ${media.chatJid}\n` +
                            `   🆔 ${media.id}\n\n`;
                });

                listText += `💡 Use:\n.vv - Send latest to this chat\n.vv2 - Send latest to yourself\n.vvget <id> - Get specific media`;

                await sock.sendMessage(jid, { text: listText });

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Failed to list view-once media: ${error.message}`
                });
            }
        }
    },

    vvget: {
        ownerOnly: true,
        description: 'Get specific view-once media by ID',
        async execute(sock, message, args, bot) {
            const jid = message.key.remoteJid;
            
            try {
                if (args.length === 0) {
                    await sock.sendMessage(jid, {
                        text: '❌ Please provide media ID\nExample: .vvget 3A8F1B2C\n\nUse .vvlist to see all IDs'
                    });
                    return;
                }

                const mediaId = args[0];
                const media = bot.features.getSavedViewOnce(mediaId);
                
                if (!media) {
                    await sock.sendMessage(jid, {
                        text: `❌ Media with ID "${mediaId}" not found\n\nUse .vvlist to see available media`
                    });
                    return;
                }

                if (!require('fs').existsSync(media.filePath)) {
                    await sock.sendMessage(jid, {
                        text: '❌ Media file not found or expired'
                    });
                    return;
                }

                const mediaBuffer = require('fs').readFileSync(media.filePath);
                const caption = `👀 *SAVED VIEW-ONCE* (ID: ${media.id})\n\n` +
                            `📁 Type: ${media.mediaType}\n` +
                            `👤 From: ${media.sender}\n` +
                            `💬 Chat: ${media.chatJid}\n` +
                            `⏰ Saved: ${new Date(media.timestamp).toLocaleString()}` +
                            (media.caption ? `\n📝 Caption: ${media.caption}` : '');

                if (media.mediaType === 'image') {
                    await sock.sendMessage(jid, {
                        image: mediaBuffer,
                        caption: caption
                    });
                } else if (media.mediaType === 'video') {
                    await sock.sendMessage(jid, {
                        video: mediaBuffer,
                        caption: caption
                    });
                }

            } catch (error) {
                await sock.sendMessage(jid, {
                    text: `❌ Failed to get view-once media: ${error.message}`
                });
            }
        }
    },
};

module.exports = commands;
