const axios = require('axios');

/**
 * AI 聊天服务
 * 使用 OpenAI 兼容接口 (如 DeepSeek, OpenAI 等)
 */
class AIService {
    constructor() {
        // 留空 API Key，用户可在 .env 中配置
        this.apiKey = process.env.AI_API_KEY || '';
        this.apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions'; // 默认使用 DeepSeek 接口
        this.model = process.env.AI_MODEL || 'deepseek-chat';
    }

    /**
     * 发送聊天请求
     * @param {string} message - 用户输入的信息
     * @returns {Promise<string>} AI 的回复
     */
    async chat(message) {
        if (!this.apiKey) {
            return "AI 助手未配置 API Key，请联系管理员。";
        }

        try {
            const response = await axios.post(this.apiUrl, {
                model: this.model,
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
                    'Authorization': `Bearer ${this.apiKey}`,
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
