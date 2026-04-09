const axios = require('axios');
const settings = require('../utils/settings');

let cachedToken = '';
let cachedExpireAt = 0;

function getCredentials() {
    return new Promise((resolve) => {
        settings.getSecret('BAIDU_OCR_API_KEY', (e1, apiKey) => {
            settings.getSecret('BAIDU_OCR_SECRET_KEY', (e2, secretKey) => {
                resolve({
                    apiKey: apiKey || '',
                    secretKey: secretKey || ''
                });
            });
        });
    });
}

async function getAccessToken() {
    if (cachedToken && cachedExpireAt > Date.now() + 60 * 1000) {
        return cachedToken;
    }

    const cred = await getCredentials();
    if (!cred.apiKey || !cred.secretKey) {
        return '';
    }

    const url = `https://aip.baidubce.com/oauth/2.0/token`;
    const res = await axios.post(url, null, {
        params: {
            grant_type: 'client_credentials',
            client_id: cred.apiKey,
            client_secret: cred.secretKey
        }
    });

    const token = res.data.access_token || '';
    const expiresIn = Number(res.data.expires_in || 0);
    cachedToken = token;
    cachedExpireAt = Date.now() + expiresIn * 1000;
    return token;
}

async function recognizePrintedText(imageBase64) {
    const token = await getAccessToken();
    if (!token) {
        return { ok: false, error: '未配置百度 OCR 密钥' };
    }

    const api = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate`;
    const res = await axios.post(
        `${api}?access_token=${encodeURIComponent(token)}`,
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

    const words = Array.isArray(res.data.words_result) ? res.data.words_result.map((w) => w.words).filter(Boolean) : [];
    return {
        ok: true,
        raw: res.data,
        text: words.join('\n')
    };
}

module.exports = {
    recognizePrintedText
};

