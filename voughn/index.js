// index.js
const WhatsAppBot = require('./bot');
const database = require('./core/database');
const fs = require('fs');
const chalk = require('chalk');
const { colorful } = require('./core/utils');

class AutoSetup {
    static async initialize() {
        colorful.bot('Voughn_MD Auto-Setup Starting...');
        
        // Create necessary folders
        await this.createFolders();
        
        // Initialize database
        await database.initialize();
        
        // Check if first-time setup
        const isFirstRun = await this.isFirstRun();
        
        if (isFirstRun) {
           // colorful.success('First-time setup!!!');
            colorful.info('You will need to link your WhatsApp account');
        } else {
            colorful.info('Resuming existing session...');
        }
        
        return true;
    }
    
    static async createFolders() {
        const folders = ['auth', 'data'];
        for (const folder of folders) {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, { recursive: true });
                colorful.success(`Created folder: ${folder}`);
            }
        }
    }
    
    static async isFirstRun() {
        try {
            const authFiles = fs.existsSync('auth') ? fs.readdirSync('auth') : [];
            const hasSettings = await database.hasExistingSettings();
            return authFiles.length === 0 && hasSettings;
        } catch (error) {
            return true;
        }
    }
}

// Main execution
async function startBot() {
    try {
        console.log(chalk.magenta.bold('═'.repeat(50)));
        console.log(chalk.magenta.bold('🚀 VOUGHN_MD BOT STARTING...'));
        console.log(chalk.magenta.bold('═'.repeat(50)));
        console.log('');
        
        // Run auto-setup
        await AutoSetup.initialize();
        
        // Start the bot
        const bot = new WhatsAppBot();
        await bot.initialize();
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n🛑 Shutting down Voughn_MD...'));
            await bot.cleanup();
            colorful.success('Bot stopped successfully');
            process.exit(0);
        });
        
    } catch (error) {
        colorful.error(`STARTUP FAILED: ${error.message}`);
        colorful.info('Please check your internet connection and try again');
        process.exit(1);
    }
}

// Start the bot
startBot();