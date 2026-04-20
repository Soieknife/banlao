// 后端配置文件
const dotenv = require('dotenv');
dotenv.config();

const config = {
	// 服务器配置
	server: {
		port: process.env.PORT || 3000,
		env: process.env.NODE_ENV || 'development',
		host: process.env.HOST || '0.0.0.0',
		// 进程配置
		process: {
			maxMemoryUsage: '1G',
			maxRestarts: 5
		}
	},
	
	// 数据库配置
	database: {
		type: process.env.DB_TYPE || 'sqlite',
		path: process.env.DB_PATH || './database.sqlite',
		// PostgreSQL 配置
		postgres: {
			host: process.env.DB_HOST || 'localhost',
			port: process.env.DB_PORT || 5432,
			user: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || '',
			database: process.env.DB_NAME || 'banlao'
		},
		// 连接池配置
		pool: {
			max: 10,
			min: 0,
			acquire: 30000,
			idle: 10000
		}
	},
	
	// API配置
	api: {
		prefix: '/api',
		timeout: 30000,
		// 请求限制
		rateLimit: {
			enabled: true,
			windowMs: 15 * 60 * 1000, // 15分钟
			max: 100 // 每IP限制请求数
		},
		// 上传配置
		upload: {
			maxSize: 5 * 1024 * 1024, // 5MB
			allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
		}
	},
	
	// 日志配置
	logger: {
		level: process.env.LOG_LEVEL || 'info',
		format: 'combined',
		file: {
			enabled: false,
			path: './logs/app.log',
			maxSize: '10MB',
			maxFiles: '7d'
		}
	},
	
	// 服务配置
	services: {
		// AI大模型服务
		ai: {
			enabled: true,
			apiKey: process.env.AI_KEY || '',
			model: 'gpt-3.5-turbo',
			baseUrl: 'https://api.openai.com/v1',
			// 缓存配置
			cache: {
				enabled: true,
				ttl: 3600 // 1小时
			}
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
			baseUrl: 'https://api.weatherapi.com/v1',
			// 缓存配置
			cache: {
				enabled: true,
				ttl: 3600 // 1小时
			}
		}
	},
	
	// 安全配置
	security: {
		jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
		jwtExpiration: '7d', // 7天
		settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || '',
		// CORS配置
		cors: {
			origins: ['*'],
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization']
		}
	},
	
	// 功能配置
	features: {
		enableAI: true,
		enableEmergency: true,
		enableVip: true,
		enableMedicationReminder: true,
		enableHealthRecord: true
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
		},
		// 特权功能
		privileges: {
			unlimitedAI: true,
			prioritySupport: true,
			adFree: true
		}
	}
};

module.exports = config;