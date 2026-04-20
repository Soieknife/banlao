// 前端配置文件
const config = {
	// API配置
	api: {
		baseUrl: 'http://localhost:3000/api',
		timeout: 10000
	},
	
	// 服务配置
	services: {
		// AI大模型服务
		ai: {
			enabled: true,
			model: 'gpt-3.5-turbo'
		},
		// OCR服务
		ocr: {
			enabled: true,
			provider: 'baidu'
		},
		// 天气服务
		weather: {
			enabled: true
		}
	},
	
	// 应用配置
	app: {
		name: '暖阳陪伴',
		version: '1.0.0'
	},
	
	// 功能配置
	features: {
		enableVoice: true,
		enableLocation: true
	}
};

export default config;