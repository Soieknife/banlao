/**
 * 百度AI语音服务工具类
 * 提供语音识别、语音合成功能
 */

// 百度AI配置
const BAIDU_CONFIG = {
  APP_ID: 'your_app_id', // 需要替换为实际的APP_ID
  API_KEY: 'your_api_key', // 需要替换为实际的API_KEY
  SECRET_KEY: 'your_secret_key' // 需要替换为实际的SECRET_KEY
};

export function hasBaiduSpeechConfig() {
  const values = [BAIDU_CONFIG.APP_ID, BAIDU_CONFIG.API_KEY, BAIDU_CONFIG.SECRET_KEY];
  return values.every((value) => value && !String(value).startsWith('your_'));
}

// 获取Access Token
async function getAccessToken() {
  try {
    const response = await uni.request({
      url: 'https://aip.baidubce.com/oauth/2.0/token',
      method: 'POST',
      data: {
        grant_type: 'client_credentials',
        client_id: BAIDU_CONFIG.API_KEY,
        client_secret: BAIDU_CONFIG.SECRET_KEY
      }
    });

    if (response.data && response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error('获取Access Token失败');
    }
  } catch (error) {
    console.error('获取Access Token错误:', error);
    throw error;
  }
}

// 语音识别
export async function speechToText(audioBase64, format = 'wav') {
  if (!hasBaiduSpeechConfig()) {
    throw new Error('未配置百度语音识别');
  }
  try {
    const accessToken = await getAccessToken();

    const response = await uni.request({
      url: `https://vop.baidu.com/server_api?dev_pid=1537&cuid=123456789&token=${accessToken}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        format: format,
        rate: 16000,
        channel: 1,
        cuid: '123456789',
        token: accessToken,
        speech: audioBase64,
        len: audioBase64.length
      }
    });

    if (response.data && response.data.result && response.data.result.length > 0) {
      return response.data.result[0];
    } else {
      throw new Error('语音识别失败');
    }
  } catch (error) {
    console.error('语音识别错误:', error);
    throw error;
  }
}

// 语音合成
export async function textToSpeech(text, options = {}) {
  try {
    const accessToken = await getAccessToken();

    const params = {
      tex: text,
      tok: accessToken,
      cuid: '123456789',
      ctp: 1,
      lan: 'zh',
      spd: options.speed || 5, // 语速
      pit: options.pitch || 5, // 音调
      vol: options.volume || 5, // 音量
      per: options.person || 0, // 发音人，0为女声，1为男声
      aue: 3 // 3为mp3格式
    };

    const response = await uni.request({
      url: 'https://tsn.baidu.com/text2audio',
      method: 'POST',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: params,
      responseType: 'arraybuffer'
    });

    if (response.data) {
      // 返回音频数据
      return response.data;
    } else {
      throw new Error('语音合成失败');
    }
  } catch (error) {
    console.error('语音合成错误:', error);
    throw error;
  }
}

// 播放合成的语音
export function playAudio(audioData) {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = uni.createInnerAudioContext();
      const base64Audio = uni.arrayBufferToBase64(audioData);
      audioContext.src = `data:audio/mp3;base64,${base64Audio}`;

      audioContext.onPlay(() => {
        console.log('开始播放语音');
      });

      audioContext.onEnded(() => {
        console.log('语音播放结束');
        resolve();
      });

      audioContext.onError((error) => {
        console.error('播放语音错误:', error);
        reject(error);
      });

      audioContext.play();
    } catch (error) {
      console.error('创建音频上下文错误:', error);
      reject(error);
    }
  });
}

// 录音功能
export class VoiceRecorder {
  constructor() {
    this.recorderManager = null;
    this.isRecording = false;
    this.onStopCallback = null;
    this.onErrorCallback = null;
    this.startAt = 0;
    this.pendingStart = false;
    this.shouldStopAfterStart = false;
  }

  // 开始录音
  startRecording(onStop, onError) {
    if (this.isRecording || this.pendingStart) return;

    this.onStopCallback = onStop;
    this.onErrorCallback = onError;
    this.recorderManager = uni.getRecorderManager();
    this.pendingStart = true;
    this.shouldStopAfterStart = false;

    this.recorderManager.onStart(() => {
      console.log('录音开始');
      this.pendingStart = false;
      this.isRecording = true;
      this.startAt = Date.now();
      if (this.shouldStopAfterStart) {
        this.stopRecording();
      }
    });

    this.recorderManager.onStop((res) => {
      console.log('录音结束', res);
      this.isRecording = false;
      this.pendingStart = false;
      this.shouldStopAfterStart = false;

      if (this.onStopCallback) {
        const duration = Number(res.duration || (Date.now() - this.startAt) || 0);
        this.onStopCallback({
          duration,
          format: 'wav',
          tempFilePath: res.tempFilePath
        });
      }
    });

    this.recorderManager.onError((error) => {
      console.error('录音错误:', error);
      this.isRecording = false;
      this.pendingStart = false;
      this.shouldStopAfterStart = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    });

    // 开始录音
    this.recorderManager.start({
      duration: 60000, // 最长录音时间60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'wav'
    });
  }

  // 停止录音
  stopRecording() {
    if (this.pendingStart) {
      this.shouldStopAfterStart = true;
      return;
    }

    if (this.recorderManager && this.isRecording) {
      this.recorderManager.stop();
    }
  }

  // 获取录音状态
  getRecordingStatus() {
    return this.isRecording || this.pendingStart;
  }
}
