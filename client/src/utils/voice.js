/**
 * 语音播报工具类
 */

// 语音播放队列
const speechQueue = [];
// 当前是否正在播放
let isPlaying = false;
// 音频上下文实例
let innerAudioContext = null;

/**
 * 播放语音
 * @param {string} text - 需要播报的文本
 * @param {Object} options - 配置选项
 */
export const speak = (text, options = {}) => {
    const { 
        lang = 'zh_CN', 
        volume = 1, 
        rate = 1, 
        pitch = 1,
        immediate = false 
    } = options;
    
    console.log('语音播报:', text);
    
    // 如果立即播放，清空队列
    if (immediate) {
        speechQueue.length = 0;
        stop();
    }
    
    // 添加到播放队列
    speechQueue.push({ text, options });
    
    // 如果当前没有播放，开始播放
    if (!isPlaying) {
        processQueue();
    }
};

/**
 * 处理播放队列
 */
const processQueue = () => {
    if (speechQueue.length === 0) {
        isPlaying = false;
        return;
    }
    
    isPlaying = true;
    const { text, options } = speechQueue.shift();
    
    // 在微信小程序环境下可以使用微信同声传译插件
    // #ifdef MP-WEIXIN
    try {
        const plugin = requirePlugin('WechatSI');
        plugin.textToSpeech({
            lang: options.lang || 'zh_CN',
            tts: true,
            content: text,
            success: (res) => {
                if (innerAudioContext) {
                    innerAudioContext.destroy();
                }
                
                innerAudioContext = uni.createInnerAudioContext();
                innerAudioContext.autoplay = true;
                innerAudioContext.src = res.filename;
                innerAudioContext.volume = options.volume || 1;
                
                innerAudioContext.onPlay(() => {
                    console.log('开始播放语音');
                });
                
                innerAudioContext.onEnded(() => {
                    console.log('语音播放结束');
                    processQueue();
                });
                
                innerAudioContext.onError((err) => {
                    console.error('语音播放失败', err);
                    processQueue();
                });
            },
            fail: (res) => {
                console.error('语音转换失败', res);
                uni.showToast({ title: '语音转换失败', icon: 'none' });
                processQueue();
            }
        });
    } catch (error) {
        console.error('微信同声传译插件未安装', error);
        uni.showToast({ title: '语音播报功能未启用', icon: 'none' });
        processQueue();
    }
    // #endif

    // 在其他环境下，可以使用简单的 H5 SpeechSynthesis (如果支持)
    // #ifdef H5
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options.lang || 'zh-CN';
        utterance.volume = options.volume || 1;
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        
        utterance.onend = () => {
            console.log('语音播放结束');
            processQueue();
        };
        
        utterance.onerror = (event) => {
            console.error('语音播放失败', event);
            processQueue();
        };
        
        window.speechSynthesis.speak(utterance);
    } else {
        uni.showToast({ title: '当前浏览器不支持语音播报', icon: 'none' });
        processQueue();
    }
    // #endif

    // App 环境下通常需要集成百度/阿里 TTS SDK，这里做简单提示
    // #ifdef APP-PLUS
    uni.showToast({ title: 'App 语音播报需集成 SDK', icon: 'none' });
    processQueue();
    // #endif
};

/**
 * 停止语音播放
 */
export const stop = () => {
    speechQueue.length = 0;
    isPlaying = false;
    
    // 停止微信小程序音频
    // #ifdef MP-WEIXIN
    if (innerAudioContext) {
        innerAudioContext.stop();
        innerAudioContext.destroy();
        innerAudioContext = null;
    }
    // #endif
    
    // 停止 H5 语音
    // #ifdef H5
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    // #endif
    
    console.log('语音播放已停止');
};

/**
 * 暂停语音播放
 */
export const pause = () => {
    // 暂停微信小程序音频
    // #ifdef MP-WEIXIN
    if (innerAudioContext) {
        innerAudioContext.pause();
    }
    // #endif
    
    // 暂停 H5 语音
    // #ifdef H5
    if ('speechSynthesis' in window) {
        window.speechSynthesis.pause();
    }
    // #endif
    
    console.log('语音播放已暂停');
};

/**
 * 继续语音播放
 */
export const resume = () => {
    // 继续微信小程序音频
    // #ifdef MP-WEIXIN
    if (innerAudioContext) {
        innerAudioContext.play();
    }
    // #endif
    
    // 继续 H5 语音
    // #ifdef H5
    if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
    }
    // #endif
    
    console.log('语音播放已继续');
};

/**
 * 检查是否支持语音播报
 * @returns {boolean} 是否支持
 */
export const isSupported = () => {
    // #ifdef H5
    return 'speechSynthesis' in window;
    // #endif
    
    // #ifdef MP-WEIXIN
    try {
        requirePlugin('WechatSI');
        return true;
    } catch (error) {
        return false;
    }
    // #endif
    
    // #ifdef APP-PLUS
    return false;
    // #endif
};
