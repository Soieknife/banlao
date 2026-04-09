const axios = require('axios');
const settings = require('../utils/settings');

/**
 * AI 聊天服务
 * 使用 OpenAI 兼容接口 (如 DeepSeek, OpenAI 等)
 */
class AIService {
    constructor() {
        // 留空 API Key，用户可在 .env 中配置
        this.apiKey = process.env.AI_API_KEY || '';
        this.apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';
        this.model = process.env.AI_MODEL || 'deepseek-chat';
    }

    async getConfig() {
        const cfg = {
            apiKey: this.apiKey,
            apiUrl: this.apiUrl,
            model: this.model
        };

        return new Promise((resolve) => {
            settings.getSecret('AI_API_KEY', (err, val) => {
                if (!err && val) cfg.apiKey = val;
                settings.getSecret('AI_API_URL', (err2, val2) => {
                    if (!err2 && val2) cfg.apiUrl = val2;
                    settings.getSecret('AI_MODEL', (err3, val3) => {
                        if (!err3 && val3) cfg.model = val3;
                        resolve(cfg);
                    });
                });
            });
        });
    }

    /**
     * 发送聊天请求
     * @param {string} message - 用户输入的信息
     * @returns {Promise<string>} AI 的回复
     */
    async chat(message) {
        const cfg = await this.getConfig();
        if (!cfg.apiKey) {
            return "AI 助手未配置 API Key，请联系管理员。";
        }

        try {
            const response = await axios.post(cfg.apiUrl, {
                model: cfg.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专门为老年人设计的智能陪伴助手，名字叫'暖阳'。你的语气要温和、耐心，多用鼓励的话语，避免使用过于专业的术语。"
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${cfg.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('AI 接口调用失败:', error.response ? error.response.data : error.message);
            return "对不起，我现在有点累了，请稍后再跟我聊吧。";
        }
    }
}

module.exports = new AIService();
