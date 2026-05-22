const DEFAULT_SERVER_PORT = 3000;
const SERVER_HOST_STORAGE_KEY = 'serverHost';
const SERVER_PORT_STORAGE_KEY = 'serverPort';

function getStoredValue(key) {
	try {
		return typeof uni !== 'undefined' ? String(uni.getStorageSync(key) || '').trim() : '';
	} catch (error) {
		return '';
	}
}

function getRuntimeHostname() {
	if (typeof window === 'undefined' || !window.location) {
		return '';
	}

	const hostname = String(window.location.hostname || '').trim();
	if (!hostname) return '';
	if (hostname === 'localhost') return '127.0.0.1';
	return hostname;
}

function resolveServerHost() {
	const storedHost = getStoredValue(SERVER_HOST_STORAGE_KEY);
	if (storedHost) return storedHost;

	const runtimeHost = getRuntimeHostname();
	if (runtimeHost) return runtimeHost;

	return '127.0.0.1';
}

function resolveServerPort() {
	const storedPort = Number(getStoredValue(SERVER_PORT_STORAGE_KEY));
	if (Number.isInteger(storedPort) && storedPort > 0) {
		return storedPort;
	}
	return DEFAULT_SERVER_PORT;
}

const serverHost = resolveServerHost();
const serverPort = resolveServerPort();
const serverOrigin = `http://${serverHost}:${serverPort}`;

const config = {
	server: {
		host: serverHost,
		port: serverPort,
		origin: serverOrigin,
		storageKeys: {
			host: SERVER_HOST_STORAGE_KEY,
			port: SERVER_PORT_STORAGE_KEY
		}
	},

	api: {
		baseUrl: `${serverOrigin}/api`,
		timeout: 10000
	},

	services: {
		ai: {
			enabled: true,
			model: 'ernie-4.0-turbo-8k'
		},
		ocr: {
			enabled: true,
			provider: 'baidu'
		},
		weather: {
			enabled: true
		}
	},

	app: {
		name: '暖阳陪伴',
		version: '1.0.0'
	},

	features: {
		enableVoice: true,
		enableLocation: true
	}
};

export default config;
