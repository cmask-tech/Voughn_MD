// core/helpers/fun.js
const axios = require('axios');

class FunHelper {
    static async getJoke() {
        try {
            const response = await axios.get('https://v2.jokeapi.dev/joke/Any?type=single');
            return response.data.joke || 'Why did the chicken cross the road? To get to the other side!';
        } catch (error) {
            return 'Why was the math book sad? Because it had too many problems!';
        }
    }

    static async getQuote() {
        try {
            const response = await axios.get('https://api.quotable.io/random');
            return `"${response.data.content}" - ${response.data.author}`;
        } catch (error) {
            return '"The only way to do great work is to love what you do." - Steve Jobs';
        }
    }

    static async getFact() {
        const facts = [
            "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly good to eat.",
            "Octopuses have three hearts.",
            "A day on Venus is longer than a year on Venus.",
            "Bananas are berries, but strawberries aren't.",
            "The shortest war in history was between Britain and Zanzibar in 1896. Zanzibar surrendered after 38 minutes.",
            "There are more possible iterations of a game of chess than there are atoms in the known universe.",
            "A group of flamingos is called a 'flamboyance'.",
            "The inventor of the Frisbee was turned into a frisbee after he died.",
            "Scotland has 421 words for 'snow'.",
            "The first computer mouse was made of wood."
        ];
        return facts[Math.floor(Math.random() * facts.length)];
    }

    static coinFlip() {
        return Math.random() > 0.5 ? 'Heads! 🪙' : 'Tails! 🪙';
    }

    static rollDice() {
        const results = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
        return results[Math.floor(Math.random() * results.length)];
    }

    static magic8Ball() {
        const answers = [
            'It is certain. 🔮', 'It is decidedly so. 🔮', 'Without a doubt. 🔮',
            'Yes definitely. 🔮', 'You may rely on it. 🔮', 'As I see it, yes. 🔮',
            'Most likely. 🔮', 'Outlook good. 🔮', 'Yes. 🔮', 'Signs point to yes. 🔮',
            'Reply hazy, try again. 🔮', 'Ask again later. 🔮', 'Better not tell you now. 🔮',
            'Cannot predict now. 🔮', 'Concentrate and ask again. 🔮',
            'Don\'t count on it. 🔮', 'My reply is no. 🔮', 'My sources say no. 🔮',
            'Outlook not so good. 🔮', 'Very doubtful. 🔮'
        ];
        return answers[Math.floor(Math.random() * answers.length)];
    }

    static rateSomething(thing) {
        const rating = Math.floor(Math.random() * 10) + 1;
        const stars = '⭐'.repeat(rating) + '☆'.repeat(10 - rating);
        return `I rate "${thing}" ${rating}/10\n${stars}`;
    }

    static shipPeople(person1, person2) {
        const percentage = Math.floor(Math.random() * 101);
        let message = `💖 Shipping ${person1} × ${person2}\n`;
        message += `💝 Love Score: ${percentage}%\n`;
        
        if (percentage < 30) message += '😬 Better stay friends...';
        else if (percentage < 60) message += '🤔 There might be something there!';
        else if (percentage < 80) message += '😍 Great match!';
        else message += '💕 Perfect couple! Soulmates!';
        
        return message;
    }
}

module.exports = FunHelper;