const axios = require('axios');
const settings = require('../utils/settings');

let cachedToken = '';
let cachedExpireAt = 0;
let cachedCredentialSignature = '';

function loadCredentialFromSettings(key) {
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

async function getCredentials() {
    const apiKeyFromSettings = await loadCredentialFromSettings('BAIDU_OCR_API_KEY');
    const secretKeyFromSettings = await loadCredentialFromSettings('BAIDU_OCR_SECRET_KEY');

    return {
        apiKey: apiKeyFromSettings || process.env.BAIDU_OCR_API_KEY || process.env.BAIDU_OCR_KEY || '',
        secretKey: secretKeyFromSettings || process.env.BAIDU_OCR_SECRET_KEY || process.env.BAIDU_OCR_SECRET || ''
    };
}

async function getAccessToken() {
    const credentials = await getCredentials();
    const signature = `${credentials.apiKey}:${credentials.secretKey}`;

    if (
        cachedToken &&
        cachedExpireAt > Date.now() + 60 * 1000 &&
        cachedCredentialSignature === signature
    ) {
        return cachedToken;
    }

    if (!credentials.apiKey || !credentials.secretKey) {
        return '';
    }

    const response = await axios.post('https://aip.baidubce.com/oauth/2.0/token', null, {
        params: {
            grant_type: 'client_credentials',
            client_id: credentials.apiKey,
            client_secret: credentials.secretKey
        }
    });

    const token = response?.data?.access_token || '';
    const expiresIn = Number(response?.data?.expires_in || 0);
    cachedToken = token;
    cachedExpireAt = Date.now() + Math.max(expiresIn - 300, 300) * 1000;
    cachedCredentialSignature = signature;
    return token;
}

async function recognizePrintedText(imageBase64) {
    try {
        const token = await getAccessToken();
        if (!token) {
            return { ok: false, error: '未配置百度 OCR 密钥' };
        }

        const response = await axios.post(
            `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate?access_token=${encodeURIComponent(token)}`,
            new URLSearchParams({
                image: imageBase64,
                detect_direction: 'true',
                probability: 'true',
                paragraph: 'true'
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        if (response?.data?.error_code) {
            return {
                ok: false,
                error: response.data.error_msg || '百度 OCR 调用失败',
                raw: response.data
            };
        }

        const words = Array.isArray(response?.data?.words_result)
            ? response.data.words_result.map((item) => item.words).filter(Boolean)
            : [];

        return {
            ok: true,
            raw: response.data,
            text: words.join('\n')
        };
    } catch (error) {
        return {
            ok: false,
            error: error.response?.data?.error_msg || error.message || 'OCR 请求失败'
        };
    }
}

module.exports = {
    recognizePrintedText
};
