// core/utils.js
const chalk = require('chalk');

// Enhanced silent logger
const logger = {
    level: 'silent',
    child: () => ({
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {}
    }),
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {}
};

// Colorful console functions
const colorful = {
    success: (text) => console.log(chalk.green('✅ ' + text)),
    error: (text) => console.log(chalk.red('❌ ' + text)),
    warning: (text) => console.log(chalk.yellow('⚠️ ' + text)),
    info: (text) => console.log(chalk.blue('ℹ️ ' + text)),
    bot: (text) => console.log(chalk.magenta('🤖 ' + text)),
    connection: (text) => console.log(chalk.cyan('🔗 ' + text)),
    qr: (text) => console.log(chalk.yellow('📸 ' + text)),
    phone: (text) => console.log(chalk.green('📱 ' + text))
};

function extractPhoneFromJid(jid) {
    return jid?.split(':')[0]?.split('@')[0] || jid;
}

function isGroupJid(jid) {
    return jid?.endsWith('@g.us');
}

function formatPhone(phone) {
    return phone.replace(/[^0-9]/g, '');
}

function generateUniqueId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

module.exports = {
    logger,
    colorful,
    extractPhoneFromJid,
    isGroupJid,
    formatPhone,
    generateUniqueId
};