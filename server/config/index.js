// 后端配置文件
const dotenv = require('dotenv');
dotenv.config();

const config = {
	// 服务器配置
	server: {
		port: process.env.PORT || 3000,
		env: process.env.NODE_ENV || 'development'
	},
	
	// 数据库配置
	database: {
		type: 'sqlite',
		path: './database.sqlite'
	},
	
	// API配置
	api: {
		prefix: '/api',
		timeout: 30000
	},
	
	// 服务配置
	services: {
		// AI大模型服务
		ai: {
			enabled: true,
			apiKey: process.env.AI_KEY || '',
			model: 'gpt-3.5-turbo',
			baseUrl: 'https://api.openai.com/v1'
		},
		// OCR服务
		ocr: {
			enabled: true,
			provider: 'baidu',
			apiKey: process.env.BAIDU_OCR_KEY || '',
			secretKey: process.env.BAIDU_OCR_SECRET || '',
			baseUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1'
		},
		// 天气服务
		weather: {
			enabled: true,
			apiKey: process.env.WEATHER_KEY || '',
			baseUrl: 'https://api.weatherapi.com/v1'
		}
	},
	
	// 安全配置
	security: {
		jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
		settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || ''
	},
	
	// 功能配置
	features: {
		enableAI: true,
		enableEmergency: true,
		enableVip: true
	},
	
	// VIP配置
	vip: {
		plans: {
			monthly: {
				price: 9.9,
				duration: 30
			},
			quarterly: {
				price: 24.9,
				duration: 90
			},
			yearly: {
				price: 89.9,
				duration: 365
			}
		}
	}
};

module.exports = config;