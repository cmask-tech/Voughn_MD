// core/helpers/tools.js
const axios = require('axios');
const qrcode = require('qrcode');
const sharp = require('sharp');


class ToolsHelper {
    static async getWeather(city) {
        try {
            const API_KEY = process.env.OPENWEATHER_API_KEY;
            
            if (!API_KEY || API_KEY === 'your_actual_openweather_api_key_here') {
                return `❌ Weather fetch error!`;
            }

            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`,
                { timeout: 10000 }
            );

            const data = response.data;
            
            // Get weather emoji based on condition
            const weatherEmoji = this.getWeatherEmoji(data.weather[0].main);
            const temperature = Math.round(data.main.temp);
            const feelsLike = Math.round(data.main.feels_like);
            const humidity = data.main.humidity;
            const windSpeed = data.wind.speed;
            const visibility = data.visibility / 1000; // Convert to km
            const pressure = data.main.pressure;
            
            // Format sunrise/sunset times
            const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            
            const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });

            const weatherMessage = `${weatherEmoji} *WEATHER IN ${data.name.toUpperCase()}, ${data.sys.country}*\n\n` +
                                 `🌡️ *Temperature:* ${temperature}°C (Feels like ${feelsLike}°C)\n` +
                                 `💧 *Humidity:* ${humidity}%\n` +
                                 `💨 *Wind:* ${windSpeed} m/s\n` +
                                 `🌫️ *Visibility:* ${visibility} km\n` +
                                 `🔽 *Pressure:* ${pressure} hPa\n` +
                                 `🌅 *Sunrise:* ${sunrise}\n` +
                                 `🌇 *Sunset:* ${sunset}\n` +
                                 `☁️ *Condition:* ${data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)}\n\n` +
                                 `📍 *Location:* ${data.coord.lat.toFixed(2)}°N, ${data.coord.lon.toFixed(2)}°E`;

            return weatherMessage;

        } catch (error) {
            console.error('Weather API Error:', error.response?.data || error.message);
            
            if (error.response?.status === 401) {
                return '❌ Invalid OpenWeatherMap 401.';
            } else if (error.response?.status === 404) {
                return `❌ City "${city}" not found.`;
            } else if (error.response?.status === 429) {
                return '⏳ Too many requests. Try again later.';
            } else if (error.code === 'ECONNABORTED') {
                return '⏰ Weather service timeout. Please try again.';
            } else {
                return `❌ Could not get weather for "${city}".`;
            }
        }
    }

    static getWeatherEmoji(condition) {
        const emojiMap = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Drizzle': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Smoke': '💨',
            'Haze': '🌫️',
            'Dust': '💨',
            'Fog': '🌫️',
            'Sand': '💨',
            'Ash': '💨',
            'Squall': '💨',
            'Tornado': '🌪️'
        };
        
        return emojiMap[condition] || '🌤️';
    }

    // Additional: Get weather for multiple cities
    static async getWeatherMultiple(cities) {
        try {
            const weatherPromises = cities.map(city => this.getWeather(city));
            const results = await Promise.allSettled(weatherPromises);
            
            let combinedMessage = '🌤️ *WEATHER FOR MULTIPLE CITIES*\n\n';
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    combinedMessage += `**${cities[index]}:**\n${result.value}\n\n`;
                } else {
                    combinedMessage += `**${cities[index]}:** ❌ Error\n\n`;
                }
            });
            
            return combinedMessage;
        } catch (error) {
            return '❌ Failed to get weather.';
        }
    }

    // Additional: Weather forecast for next 5 days
    static async getWeatherForecast(city) {
        try {
            const API_KEY = process.env.OPENWEATHER_API_KEY;
            
            if (!API_KEY) {
                return '❌ Weather fetch error.';
            }

            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`,
                { timeout: 10000 }
            );

            const data = response.data;
            let forecastMessage = `📅 *5-DAY WEATHER FORECAST FOR ${data.city.name.toUpperCase()}*\n\n`;
            
            // Group by day and take one reading per day
            const dailyForecasts = {};
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000).toLocaleDateString();
                if (!dailyForecasts[date]) {
                    dailyForecasts[date] = item;
                }
            });
            
            Object.entries(dailyForecasts).slice(0, 5).forEach(([date, forecast]) => {
                const emoji = this.getWeatherEmoji(forecast.weather[0].main);
                const temp = Math.round(forecast.main.temp);
                const condition = forecast.weather[0].description;
                
                forecastMessage += `**${date}:** ${emoji} ${temp}°C - ${condition}\n`;
            });
            
            return forecastMessage;

        } catch (error) {
            //console.error('Forecast API Error:', error.response?.data || error.message);
            return `❌ Could not get forecast for "${city}".`;
        }
    }




    static async generateQR(text) {
        try {
            const qrDataUrl = await qrcode.toDataURL(text);
            return qrDataUrl;
        } catch (error) {
            throw new Error('Failed to generate QR code');
        }
    }

    static calculate(expression) {
        try {
            // Safe evaluation - only allow basic math operations
            const safeExpression = expression.replace(/[^0-9+\-*/().]/g, '');
            const result = eval(safeExpression);
            return `🧮 Calculation: ${expression} = ${result}`;
        } catch (error) {
            return '❌ Invalid mathematical expression';
        }
    }

    static convertCurrency(amount, from, to) {
        // This is a simplified version - you'd need a real API for accurate rates
        const rates = {
            USD: 1,
            EUR: 0.85,
            GBP: 0.73,
            JPY: 110.5,
            CAD: 1.25,
            AUD: 1.35,
            CNY: 6.45,
            INR: 74.5,
            KES: 110.5
        };

        if (!rates[from] || !rates[to]) {
            return '❌ Unsupported currency';
        }

        const converted = (amount * rates[to] / rates[from]).toFixed(2);
        return `💱 ${amount} ${from} = ${converted} ${to}`;
    }

    static async createSticker(imageBuffer) {
        try {
            // Use sharp to resize and convert to PNG for stickers
            const stickerBuffer = await sharp(imageBuffer)
                .resize(512, 512)
                .png()
                .toBuffer();
            return stickerBuffer;
        } catch (error) {
            throw new Error('Failed to create sticker');
        }
    }

    static async textToImage(text) {
        try {
            // Create SVG with text and convert to PNG using sharp
            const svgImage = `
                <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#2d3436"/>
                    <text x="50%" y="50%" font-family="Arial" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
                </svg>
            `;
            
            const imageBuffer = await sharp(Buffer.from(svgImage))
                .png()
                .toBuffer();
                
            return imageBuffer;
        } catch (error) {
            throw new Error('Failed to create text image');
        }
    }

    // Additional helper methods with sharp
    static async resizeImage(buffer, width = 512, height = 512) {
        return await sharp(buffer)
            .resize(width, height)
            .png()
            .toBuffer();
    }

    static async blurImage(buffer, sigma = 5) {
        return await sharp(buffer)
            .blur(sigma)
            .png()
            .toBuffer();
    }

    static async rotateImage(buffer, degrees = 90) {
        return await sharp(buffer)
            .rotate(degrees)
            .png()
            .toBuffer();
    }
}

module.exports = ToolsHelper;