// core/helpers/chatbot.js
const axios = require('axios');

class ChatbotHelper {
    constructor() {
        this.conversations = new Map();
        this.maxHistory = 5; // Keep last 5 messages for context
    }

    // Enhanced Gemini with conversation context
    static async geminiChat(prompt, userId, language = 'en') {
        try {
            const API_KEY = process.env.GEMINI_API_KEY;
            
            if (!API_KEY || API_KEY === '' || API_KEY.includes('xxxx')) {
                //console.log('⚠️  Gemini key not set, using simple AI');
                return this.simpleAIResponse(prompt, language);
            }

            // Get conversation history
            const conversationHistory = this.getConversationHistory(userId);
            
            // Build context with history
            let context = '';
            if (conversationHistory.length > 0) {
                context = 'Previous conversation:\n';
                conversationHistory.forEach(entry => {
                    context += `User: ${entry.user}\nAssistant: ${entry.assistant}\n`;
                });
                context += '\n';
            }

            const systemPrompt = language === 'sw' 
                ? `${context}Jibu kwa Kiswahili. Weka jibu lako fupi (chini ya maneno 100). Mtumiaji: ${prompt}`
                : `${context}Respond in ${language}. Keep your response short (under 100 words). User: ${prompt}`;

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
                {
                    contents: [{
                        parts: [{ text: systemPrompt }]
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 300,
                        topP: 0.9,
                        topK: 40
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH", 
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            let geminiResponse = '';
            
            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                geminiResponse = response.data.candidates[0].content.parts[0].text.trim();
                
                // Clean response
                geminiResponse = geminiResponse.replace(/\*\*(.*?)\*\*/g, '$1');
                geminiResponse = geminiResponse.replace(/\*(.*?)\*/g, '$1');
                
                // Store in conversation history
                this.addToConversationHistory(userId, prompt, geminiResponse);
                
                return geminiResponse;
            } else {
                throw new Error('No response from Gemini');
            }

        } catch (error) {
           // console.error('🔴 Gemini Error:', error.response?.data?.error?.message || error.message);
            
            // Specific error handling
            if (error.response?.status === 400) {
                return '🤖 I cannot respond!';
            } else if (error.response?.status === 429) {
                return '⏳ loading';
            }
            
            return this.simpleAIResponse(prompt, language);
        }
    }

    // Conversation history management
    static getConversationHistory(userId) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, []);
        }
        return this.conversations.get(userId);
    }

    static addToConversationHistory(userId, userMessage, assistantResponse) {
        const history = this.getConversationHistory(userId);
        history.push({
            user: userMessage,
            assistant: assistantResponse,
            timestamp: Date.now()
        });
        
        // Keep only last 5 messages
        if (history.length > this.maxHistory) {
            history.shift();
        }
        
        this.conversations.set(userId, history);
    }

    // Enhanced main chat method
    static async chat(prompt, userId, language = 'auto') {
        try {
            // Auto-detect language
            let targetLanguage = language;
            if (language === 'auto') {
                targetLanguage = await this.detectLanguage(prompt);
            }

            console.log(`🤖 [${targetLanguage}] User: ${prompt}`);

            // Try Gemini first
            let response = await this.geminiChat(prompt, userId, targetLanguage);
            
            // Fallback check
            if (!response || 
                response.includes('API key') || 
                response.includes('cannot respond') ||
                response.includes('Too many requests')) {
                
                //console.log('🔄 Falling back to simple AI');
                response = this.simpleAIResponse(prompt, targetLanguage);
            }

            console.log(`🤖 Response: ${response.substring(0, 80)}...`);
            return response;

        } catch (error) {
            console.error('🔴 Chat error:', error.message);
            return this.simpleAIResponse(prompt, language === 'auto' ? 'en' : language);
        }
    }

}

module.exports = ChatbotHelper;