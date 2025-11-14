// core/helpers/search.js
const axios = require('axios');

class SearchHelper {
    static async searchGoogle(query) {
        try {
            return `🔍 Google Search for: "${query}"\n\n📎 https://www.google.com/search?q=${encodeURIComponent(query)}\n\n💡 `;
        } catch (error) {
            return '❌ Failed to search Google';
        }
    }

    static async searchYouTube(query) {
        try {
            return `🎬 YouTube Search for: "${query}"\n\n📎 https://www.youtube.com/results?search_query=${encodeURIComponent(query)}\n\n💡 .`;
        } catch (error) {
            return '❌ Failed to search YouTube';
        }
    }

    static async searchWikipedia(query) {
        try {
            const response = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            const data = response.data;
            
            return `📚 Wikipedia: ${data.title}\n\n${data.extract}\n\n📎 ${data.content_urls.desktop.page}`;
        } catch (error) {
            return `❌ Wikipedia article not found for: "${query}"`;
        }
    }

    static async searchLyrics(song) {
        try {
            // Using a lyrics API (you might need to sign up for a free API key)
            return `🎵 Lyrics for: "${song}"\n\n📝 Lyrics \n\n💡 Try: .lyrics "shape of you"`;
        } catch (error) {
            return '❌ Failed to fetch lyrics';
        }
    }

    static async searchMovie(title) {
        try {
            // Using OMDb API (you need to get a free API key)
            return `🎬 Movie: "${title}"\n\n🎭 Movie details.\n\n💡`;
        } catch (error) {
            return '❌ Failed to fetch movie information';
        }
    }
}

module.exports = SearchHelper;