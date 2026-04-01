/**
 * 语音播报工具类
 * @param {string} text - 需要播报的文本
 */
export const speak = (text) => {
    console.log('正在语音播报:', text);
    
    // 在微信小程序环境下可以使用微信同声传译插件
    // #ifdef MP-WEIXIN
    const plugin = requirePlugin('WechatSI');
    plugin.textToSpeech({
        lang: 'zh_CN',
        tts: true,
        content: text,
        success: (res) => {
            const innerAudioContext = uni.createInnerAudioContext();
            innerAudioContext.autoplay = true;
            innerAudioContext.src = res.filename;
            innerAudioContext.onPlay(() => {
                console.log('开始播放语音');
            });
            innerAudioContext.onError((err) => {
                console.log('语音播放失败', err);
            });
        },
        fail: (res) => {
            console.log('语音转换失败', res);
        }
    });
    // #endif

    // 在其他环境下，可以使用简单的 H5 SpeechSynthesis (如果支持)
    // #ifdef H5
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        window.speechSynthesis.speak(utterance);
    } else {
        uni.showToast({ title: '当前浏览器不支持语音播报', icon: 'none' });
    }
    // #endif

    // App 环境下通常需要集成百度/阿里 TTS SDK，这里做简单提示
    // #ifdef APP-PLUS
    uni.showToast({ title: 'App 语音播报需集成 SDK', icon: 'none' });
    // #endif
};
