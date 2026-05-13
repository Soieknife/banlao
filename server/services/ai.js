const axios = require('axios');
const settings = require('../utils/settings');

const DEFAULT_V2_URL = 'https://qianfan.baidubce.com/v2/chat/completions';
const DEFAULT_V2_MODEL = 'ernie-4.0-turbo-8k';

function readSecret(key) {
    return new Promise((resolve) => {
        settings.getSecret(key, (error, value) => {
            if (error || !value) {
                resolve('');
                return;
            }
            resolve(String(value).trim());
        });
    });
}

class AIService {
    constructor() {
        this.accessToken = '';
        this.tokenExpiry = 0;
        this.cachedCredentialSignature = '';
    }

    async getConfig() {
        const [
            aiApiKeyFromSettings,
            aiApiUrlFromSettings,
            aiModelFromSettings,
            legacyApiKeyFromSettings,
            legacySecretKeyFromSettings
        ] = await Promise.all([
            readSecret('AI_API_KEY'),
            readSecret('AI_API_URL'),
            readSecret('AI_MODEL'),
            readSecret('BAIDU_API_KEY'),
            readSecret('BAIDU_SECRET_KEY')
        ]);

        const apiKey = aiApiKeyFromSettings || process.env.AI_API_KEY || '';
        const apiUrl = aiApiUrlFromSettings || process.env.AI_API_URL || DEFAULT_V2_URL;
        const model = aiModelFromSettings || process.env.AI_MODEL || DEFAULT_V2_MODEL;
        const legacyApiKey = legacyApiKeyFromSettings || process.env.BAIDU_API_KEY || process.env.AI_KEY || '';
        const legacySecretKey = legacySecretKeyFromSettings || process.env.BAIDU_SECRET_KEY || '';

        return {
            apiKey,
            apiUrl,
            model,
            legacyApiKey,
            legacySecretKey,
            useV2: Boolean(apiKey)
        };
    }

    async getLegacyAccessToken(config) {
        const apiKey = config?.legacyApiKey || '';
        const secretKey = config?.legacySecretKey || '';
        if (!apiKey || !secretKey) {
            throw new Error('Legacy AI credentials are not configured');
        }

        const credentialSignature = `${apiKey}:${secretKey}`;
        const now = Date.now();
        if (
            this.accessToken &&
            this.tokenExpiry &&
            now < this.tokenExpiry &&
            this.cachedCredentialSignature === credentialSignature
        ) {
            return this.accessToken;
        }

        const response = await axios.post('https://aip.baidubce.com/oauth/2.0/token', null, {
            params: {
                grant_type: 'client_credentials',
                client_id: apiKey,
                client_secret: secretKey
            }
        });

        const token = response?.data?.access_token || '';
        const expiresIn = Number(response?.data?.expires_in || 0);
        if (!token) {
            throw new Error('Failed to obtain legacy AI access token');
        }

        this.accessToken = token;
        this.tokenExpiry = now + Math.max(expiresIn - 300, 300) * 1000;
        this.cachedCredentialSignature = credentialSignature;
        return token;
    }

    buildMessages(message, systemPrompt) {
        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: String(message || '') }
        ];
    }

    async callV2Chat(config, message, options) {
        const response = await axios.post(
            config.apiUrl || DEFAULT_V2_URL,
            {
                model: config.model || DEFAULT_V2_MODEL,
                messages: this.buildMessages(message, options.systemPrompt),
                temperature: options.temperature ?? 0.4,
                max_tokens: options.maxTokens ?? 1024,
                stream: false
            },
            {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const text = response?.data?.choices?.[0]?.message?.content
            || response?.data?.result
            || '';

        if (!text) {
            throw new Error(`Unexpected v2 response: ${JSON.stringify(response?.data || {})}`);
        }

        return String(text).trim();
    }

    async callLegacyChat(config, message, options) {
        const accessToken = await this.getLegacyAccessToken(config);
        const response = await axios.post(
            `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`,
            {
                messages: this.buildMessages(message, options.systemPrompt),
                stream: false,
                temperature: options.temperature ?? 0.4,
                max_tokens: options.maxTokens ?? 1024
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const text = response?.data?.result || '';
        if (!text) {
            throw new Error(`Unexpected legacy response: ${JSON.stringify(response?.data || {})}`);
        }

        return String(text).trim();
    }

    async chat(message, options = {}) {
        const config = await this.getConfig();
        const finalOptions = {
            systemPrompt: options.systemPrompt
                || '你是一个适老化智能助手，表达要温和、清晰、直接，优先给出易懂、可靠的回答。',
            temperature: options.temperature,
            maxTokens: options.maxTokens
        };

        if (!config.useV2 && !config.legacyApiKey) {
            return 'AI 助手尚未配置，请联系管理员。';
        }

        try {
            if (config.useV2) {
                return await this.callV2Chat(config, message, finalOptions);
            }

            return await this.callLegacyChat(config, message, finalOptions);
        } catch (error) {
            console.error('[AI] Request failed:', error.response?.data || error.message);
            return '抱歉，我现在暂时无法回答，请稍后再试。';
        }
    }
}

module.exports = new AIService();
