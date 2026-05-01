const axios = require('axios');
const settings = require('../utils/settings');

/**
 * AI 聊天服务
 * 集成百度文心一言API
 */
class AIService {
    constructor() {
        // 百度文心一言配置
        this.apiKey = process.env.BAIDU_API_KEY || '';
        this.secretKey = process.env.BAIDU_SECRET_KEY || '';
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * 获取百度Access Token
     */
    async getAccessToken() {
        // 如果token存在且未过期，直接返回
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post('https://aip.baidubce.com/oauth/2.0/token', null, {
                params: {
                    grant_type: 'client_credentials',
                    client_id: this.apiKey,
                    client_secret: this.secretKey
                }
            });

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                // token有效期30天，这里设置为25天后过期
                this.tokenExpiry = Date.now() + (25 * 24 * 60 * 60 * 1000);
                return this.accessToken;
            } else {
                throw new Error('获取Access Token失败');
            }
        } catch (error) {
            console.error('获取百度Access Token失败:', error);
            throw error;
        }
    }

    /**
     * 获取配置（兼容原有接口）
     */
    async getConfig() {
        const cfg = {
            apiKey: this.apiKey,
            secretKey: this.secretKey
        };

        return new Promise((resolve) => {
            settings.getSecret('BAIDU_API_KEY', (err, val) => {
                if (!err && val) cfg.apiKey = val;
                settings.getSecret('BAIDU_SECRET_KEY', (err2, val2) => {
                    if (!err2 && val2) cfg.secretKey = val2;
                    resolve(cfg);
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
        if (!cfg.apiKey || !cfg.secretKey) {
            return "AI 助手未配置百度API密钥，请联系管理员。";
        }

        try {
            const accessToken = await this.getAccessToken();

            const response = await axios.post(
                `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`,
                {
                    messages: [
                        {
                            role: "system",
                            content: "你是一个专门为老年人设计的智能陪伴助手，名字叫'暖阳'。你的语气要温和、耐心，多用鼓励的话语，避免使用过于专业的术语。请用简洁易懂的语言与老人交流。"
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    stream: false,
                    temperature: 0.7,
                    max_tokens: 1024
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.result) {
                return response.data.result;
            } else {
                console.error('百度AI响应格式异常:', response.data);
                return "抱歉，我现在有点忙，请稍后再试。";
            }
        } catch (error) {
            console.error('百度AI聊天请求失败:', error.response?.data || error.message);
            return "抱歉，我现在无法回复，请稍后再试。";
        }
    }

}

module.exports = new AIService();
