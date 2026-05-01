/**
 * 语音播报工具类
 */

// 语音播放队列
const speechQueue = [];
// 当前是否正在播放
let isPlaying = false;
// 音频上下文实例
let innerAudioContext = null;
let androidTts = null;
let androidTtsReady = false;
let androidTtsInitializing = false;
const androidPendingSpeech = [];

const getAppSpeech = () => {
    if (typeof plus === 'undefined' || !plus.speech) return null;
    return plus.speech;
};

const initAndroidTts = (onReady) => {
    // #ifdef APP-PLUS
    if (typeof plus === 'undefined' || plus.os?.name !== 'Android') return false;
    if (androidTtsReady && androidTts) {
        onReady?.(androidTts);
        return true;
    }
    if (androidTtsInitializing) {
        if (onReady) androidPendingSpeech.push(onReady);
        return true;
    }

    try {
        androidTtsInitializing = true;
        if (onReady) androidPendingSpeech.push(onReady);
        const mainActivity = plus.android.runtimeMainActivity();
        const TextToSpeech = plus.android.importClass('android.speech.tts.TextToSpeech');
        const Locale = plus.android.importClass('java.util.Locale');
        const OnInitListener = plus.android.implements('android.speech.tts.TextToSpeech$OnInitListener', {
            onInit: (status) => {
                androidTtsInitializing = false;
                if (status === 0 && androidTts) {
                    androidTtsReady = true;
                    androidTts.setLanguage(Locale.CHINA);
                    while (androidPendingSpeech.length) {
                        const callback = androidPendingSpeech.shift();
                        callback?.(androidTts);
                    }
                } else {
                    androidTtsReady = false;
                    androidPendingSpeech.length = 0;
                }
            }
        });
        androidTts = new TextToSpeech(mainActivity, OnInitListener);
        return true;
    } catch (error) {
        console.error('初始化 Android TTS 失败', error);
        androidTtsInitializing = false;
        androidTtsReady = false;
        androidPendingSpeech.length = 0;
        return false;
    }
    // #endif

    return false;
};

const speakWithAndroidTts = (text, options = {}) => {
    // #ifdef APP-PLUS
    const trySpeak = (ttsInstance) => {
        try {
            const TextToSpeech = plus.android.importClass('android.speech.tts.TextToSpeech');
            ttsInstance.speak(text, TextToSpeech.QUEUE_FLUSH, null, `banlao-${Date.now()}`);
            setTimeout(() => {
                processQueue();
            }, Math.max(1200, Math.min(String(text).length * 260, 8000)));
        } catch (error) {
            console.error('Android TTS 播报失败', error);
            processQueue();
        }
    };

    if (androidTtsReady && androidTts) {
        trySpeak(androidTts);
        return true;
    }

    const initialized = initAndroidTts((ttsInstance) => {
        trySpeak(ttsInstance);
    });

    return initialized;
    // #endif

    return false;
};

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

    // App 环境下优先使用原生语音播报能力
    // #ifdef APP-PLUS
    const appSpeech = getAppSpeech();
    if (appSpeech && typeof appSpeech.speak === 'function') {
        try {
            appSpeech.speak(
                text,
                () => {
                    console.log('App 语音播放结束');
                    processQueue();
                },
                (err) => {
                    console.error('App 语音播放失败', err);
                    processQueue();
                },
                {
                    volume: options.volume || 1,
                    speechRate: options.rate || 1,
                    pitch: options.pitch || 1
                }
            );
        } catch (error) {
            console.error('App 语音播报调用失败', error);
            if (!speakWithAndroidTts(text, options)) {
                processQueue();
            }
        }
    } else {
        console.warn('当前 App 环境不支持 plus.speech，尝试 Android TTS');
        if (!speakWithAndroidTts(text, options)) {
            processQueue();
        }
    }
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

    // #ifdef APP-PLUS
    const appSpeech = getAppSpeech();
    if (appSpeech && typeof appSpeech.stop === 'function') {
        try {
            appSpeech.stop();
        } catch (error) {
            console.error('停止 App 语音播报失败', error);
        }
    }
    if (androidTts) {
        try {
            androidTts.stop();
        } catch (error) {
            console.error('停止 Android TTS 失败', error);
        }
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
    const appSpeech = getAppSpeech();
    if (appSpeech && typeof appSpeech.speak === 'function') {
        return true;
    }
    return initAndroidTts();
    // #endif
};
