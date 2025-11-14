// core/prompts.js
const readline = require('readline');
const chalk = require('chalk');

class Prompts {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async ask(question) {
        return new Promise((resolve) => {
            this.rl.question(chalk.cyan(question), (answer) => {
                resolve(answer);
            });
        });
    }

    close() {
        this.rl.close();
    }

    async askPhoneNumber() {
        console.log(chalk.cyan("╔═════════════VOUGHN_MD════════════╗"));
        console.log(chalk.cyan("║       VOUGHN_MD_WATSAPP_BOT      ║"));
        console.log(chalk.cyan("║         PHONE NUMBER INPUT       ║"));
        console.log(chalk.cyan("╚══════════════════════════════════╝"));
        
        const phoneNumber = await this.ask(chalk.yellow("✨ ") + chalk.white("Enter your phone number (with country code, e.g., 254XXXXXXXXX): "));
        
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
        
        if (!cleanNumber) {
            console.log(chalk.red("❌ Phone number is required for pairing code"));
            process.exit(1);
        }
        
        console.log(chalk.blue("📱 Using phone number: +" + cleanNumber));
        return cleanNumber;
    }
}

module.exports = new Prompts();