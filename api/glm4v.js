const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const COGVIEW_API_URL = 'https://open.bigmodel.cn/api/paas/v4/images/generations'

// 默认提示词
let ANALYSIS_PROMPT = "分析视频内容，每个分镜在第几秒在干什么，分镜内容是什么，分镜间切换时镜头是怎么切换的，比如近景切远景，"

// 叙事结构分析提示
let NARRATIVE_PROMPT = "基于以下视频分析结果，进行叙事结构分析，包括：1. 三幕剧结构分析（起因、经过、结果）；2. 旁白的情感曲线；3. 视觉元素与情感表达的关系。请详细说明每个部分。\n\n视频分析结果：\n"

// 分镜脚本生成提示
let SCRIPT_PROMPT = "基于以下视频分析和叙事结构分析，创建一个新的分镜脚本。脚本应包括：1. 具体画面描述；2. 运镜指导（推、拉、摇、移等）；3. 每个镜头的AI绘画提示词。\n\n每个镜头必须包含独立的AI绘画提示词部分，使用固定格式：\"AI绘画提示词：XXX\"（注意使用中文冒号）。请确保每个镜头都有一个清晰的提示词，这对后续处理非常重要。\n\n视频分析结果：\n{videoAnalysis}\n\n叙事结构分析：\n{narrativeAnalysis}\n\n原始用户需求：\n{userPrompt}"

// 从分镜脚本提取AI绘画提示词的正则表达式
const PROMPT_REGEX = /AI绘画提示词[：:]\s*["']?([^"'\n]+)["']?/g;

// 获取所有提示词
const getPrompts = () => {
	// 先尝试从本地存储获取
	try {
		const savedPrompts = uni.getStorageSync('custom_prompts');
		if (savedPrompts) {
			const parsedPrompts = JSON.parse(savedPrompts);
			// 如果本地有保存，则使用保存的提示词
			ANALYSIS_PROMPT = parsedPrompts.analysis || ANALYSIS_PROMPT;
			NARRATIVE_PROMPT = parsedPrompts.narrative || NARRATIVE_PROMPT;
			SCRIPT_PROMPT = parsedPrompts.script || SCRIPT_PROMPT;
		}
	} catch (e) {
		console.error('获取保存的提示词失败:', e);
	}
	
	// 返回当前使用的提示词
	return {
		analysis: ANALYSIS_PROMPT,
		narrative: NARRATIVE_PROMPT,
		script: SCRIPT_PROMPT
	};
};

// 设置提示词
const setPrompts = (prompts) => {
	if (prompts.analysis) ANALYSIS_PROMPT = prompts.analysis;
	if (prompts.narrative) NARRATIVE_PROMPT = prompts.narrative;
	if (prompts.script) SCRIPT_PROMPT = prompts.script;
	
	// 保存到本地存储
	try {
		uni.setStorageSync('custom_prompts', JSON.stringify({
			analysis: ANALYSIS_PROMPT,
			narrative: NARRATIVE_PROMPT,
			script: SCRIPT_PROMPT
		}));
	} catch (e) {
		console.error('保存提示词失败:', e);
	}
	
	return true;
};

// 获取API Key
const getApiKey = () => {
	const apiKey = uni.getStorageSync('glm4v_api_key')
	if (!apiKey) {
		throw new Error('请先在设置中配置API Key')
	}
	return apiKey
}

// 从消息中提取视频 URL
const extractVideoUrl = (message) => {
	const urlMatch = message.match(/@@(https?:\/\/[^\s]+)/);
	return urlMatch ? urlMatch[1] : null;
}

// 分析视频
const analyzeVideo = async (message, videoUrl) => {
	try {
		if (!videoUrl) {
			throw new Error('未找到有效的视频URL，请先输入视频链接');
		}

		console.log('发送请求，视频URL:', videoUrl);

		// 构建请求数据
		const requestData = {
			model: "glm-4v-plus",
			messages: [
				{
					"role": "user",
					"content": [
						{
							"type": "text",
							"text": ANALYSIS_PROMPT
						},
						{
							"type": "video_url",
							"video_url": {
								"url": videoUrl
							}
						}
					]
				}
			],
			stream: false
		};

		console.log('请求数据:', JSON.stringify(requestData, null, 2));

		// 发送请求到 GLM-4V API
		const response = await uni.request({
			url: API_URL,
			method: 'POST',
			data: requestData,
			header: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + getApiKey()
			}
		});

		console.log('API响应:', JSON.stringify(response.data, null, 2));

		if (response.statusCode === 200) {
			if (!response.data || !response.data.choices || !response.data.choices[0]) {
				throw new Error('API 响应格式错误：' + JSON.stringify(response.data));
			}

			const choice = response.data.choices[0];
			if (!choice.message || !choice.message.content) {
				throw new Error('API 响应内容格式错误：' + JSON.stringify(choice));
			}

			// 处理返回的内容
			let responseText;
			if (Array.isArray(choice.message.content)) {
				// 如果是数组，找到 type 为 text 的内容
				const textContent = choice.message.content.find(item => item.type === 'text');
				responseText = textContent ? textContent.text : '无法解析返回内容';
			} else {
				// 如果不是数组，直接使用内容
				responseText = choice.message.content;
			}

			return {
				success: true,
				response: responseText
			};
		} else {
			throw new Error('API 请求失败：' + JSON.stringify(response.data));
		}

	} catch (error) {
		console.error('视频分析错误:', error);
		throw error;
	}
};

// 进行叙事结构分析
const analyzeNarrativeStructure = async (videoAnalysis) => {
	try {
		// 构建请求数据
		const requestData = {
			model: "glm-4-plus",
			messages: [
				{
					"role": "user",
					"content": NARRATIVE_PROMPT + videoAnalysis
				}
			],
			stream: false
		};

		// 发送请求到 GLM-4 API
		const response = await uni.request({
			url: API_URL,
			method: 'POST',
			data: requestData,
			header: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + getApiKey()
			}
		});

		if (response.statusCode === 200) {
			if (!response.data || !response.data.choices || !response.data.choices[0]) {
				throw new Error('API 响应格式错误');
			}

			const choice = response.data.choices[0];
			if (!choice.message || !choice.message.content) {
				throw new Error('API 响应内容格式错误');
			}

			return {
				success: true,
				response: choice.message.content
			};
		} else {
			throw new Error('API 请求失败');
		}
	} catch (error) {
		console.error('叙事结构分析错误:', error);
		throw error;
	}
};

// 生成新的分镜脚本
const generateNewScript = async (videoAnalysis, narrativeAnalysis, userPrompt) => {
	try {
		// 构建提示
		const prompt = SCRIPT_PROMPT
			.replace('{videoAnalysis}', videoAnalysis)
			.replace('{narrativeAnalysis}', narrativeAnalysis)
			.replace('{userPrompt}', userPrompt);

		// 构建请求数据
		const requestData = {
			model: "glm-4-plus",
			messages: [
				{
					"role": "user",
					"content": prompt
				}
			],
			stream: false
		};

		// 发送请求到 GLM-4 API
		const response = await uni.request({
			url: API_URL,
			method: 'POST',
			data: requestData,
			header: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + getApiKey()
			}
		});

		if (response.statusCode === 200) {
			if (!response.data || !response.data.choices || !response.data.choices[0]) {
				throw new Error('API 响应格式错误');
			}

			const choice = response.data.choices[0];
			if (!choice.message || !choice.message.content) {
				throw new Error('API 响应内容格式错误');
			}

			return {
				success: true,
				response: choice.message.content
			};
		} else {
			throw new Error('API 请求失败');
		}
	} catch (error) {
		console.error('分镜脚本生成错误:', error);
		throw error;
	}
};

// 从分镜脚本中提取AI绘画提示词
const extractPrompts = (scriptContent) => {
	const prompts = [];
	let match;
	
	// 使用多种正则表达式匹配不同格式的提示词
	const regexPatterns = [
		/AI绘画提示词[：:]\s*["']?([^"'\n]+)["']?/g,  // 标准格式: AI绘画提示词: "xxx"
		/AI绘画提示词[：:]\s*(.*?)(?:\n|$)/g,         // 无引号格式: AI绘画提示词: xxx
		/提示词[：:]\s*["']?([^"'\n]+)["']?/g,        // 简化格式: 提示词: "xxx"
		/提示词[：:]\s*(.*?)(?:\n|$)/g,               // 简化无引号格式: 提示词: xxx
		/绘画提示[：:]\s*(.*?)(?:\n|$)/g              // 另一种常见格式: 绘画提示: xxx
	];
	
	// 尝试所有正则表达式
	for (const regex of regexPatterns) {
		while ((match = regex.exec(scriptContent)) !== null) {
			const prompt = match[1].trim();
			if (prompt && !prompts.includes(prompt)) {
				prompts.push(prompt);
			}
		}
	}
	
	// 如果没有找到提示词，尝试提取镜头描述作为提示词
	if (prompts.length === 0) {
		// 查找镜头/场景描述
		const sceneMatches = scriptContent.match(/镜头\d+[：:]\s*(.*?)(?:\n|$)/g) || 
			                 scriptContent.match(/场景\d+[：:]\s*(.*?)(?:\n|$)/g);
		
		if (sceneMatches) {
			for (const sceneMatch of sceneMatches) {
				const description = sceneMatch.split(/[：:]\s*/)[1].trim();
				if (description && !prompts.includes(description)) {
					prompts.push(description);
				}
			}
		}
	}
	
	// 输出日志，帮助调试
	console.log('提取的提示词:', prompts);
	
	return prompts;
};

// 使用CogView生成图像
const generateStoryboardImages = async (scriptContent) => {
	try {
		// 从脚本中提取提示词
		const prompts = extractPrompts(scriptContent);
		
		if (prompts.length === 0) {
			console.warn('无法从分镜脚本中提取有效的AI绘画提示词，将使用默认提示词');
			
			// 创建基于原始脚本内容的默认提示词
			const defaultPrompts = [];
			
			// 尝试提取剧本主题作为提示词
			const scriptLines = scriptContent.split('\n');
			let title = '剧本场景';
			
			// 尝试从前几行提取主题
			for (let i = 0; i < Math.min(10, scriptLines.length); i++) {
				const line = scriptLines[i].trim();
				if (line && line.length > 5 && line.length < 30 && !line.includes('：') && !line.includes(':')) {
					title = line;
					break;
				}
			}
			
			// 创建3个默认提示词
			defaultPrompts.push(`电影场景 ${title} 高清电影质感`);
			defaultPrompts.push(`电影剧照 ${title} 场景 细节丰富 写实风格`);
			defaultPrompts.push(`电影分镜 ${title} 场景布局 色彩鲜明`);
			
			// 记录生成过程和结果
			const generations = [];
			
			// 对每个提示词生成图像
			for (const prompt of defaultPrompts) {
				// 构建请求数据
				const requestData = {
					model: "cogview-3",
					prompt: prompt,
					n: 1,  // 每个提示词生成1张图
					size: "1024x1024"  // 图像尺寸
				};
				
				// 发送请求到CogView API
				const response = await uni.request({
					url: COGVIEW_API_URL,
					method: 'POST',
					data: requestData,
					header: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer ' + getApiKey()
					}
				});
				
				// 检查响应
				if (response.statusCode === 200) {
					if (!response.data || !response.data.data || !response.data.data.length) {
						throw new Error('CogView API响应格式错误');
					}
					
					// 添加到生成结果
					generations.push({
						prompt,
						imageUrl: response.data.data[0].url
					});
				} else {
					throw new Error('CogView API请求失败: ' + JSON.stringify(response.data));
				}
			}
			
			return {
				success: true,
				images: generations
			};
		}
		
		// 记录生成过程和结果
		const generations = [];
		
		// 对每个提示词生成图像
		for (const prompt of prompts) {
			// 构建请求数据
			const requestData = {
				model: "cogview-3",
				prompt: prompt,
				n: 1,  // 每个提示词生成1张图
				size: "1024x1024"  // 图像尺寸
			};
			
			// 发送请求到CogView API
			const response = await uni.request({
				url: COGVIEW_API_URL,
				method: 'POST',
				data: requestData,
				header: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + getApiKey()
				}
			});
			
			// 检查响应
			if (response.statusCode === 200) {
				if (!response.data || !response.data.data || !response.data.data.length) {
					throw new Error('CogView API响应格式错误');
				}
				
				// 添加到生成结果
				generations.push({
					prompt,
					imageUrl: response.data.data[0].url
				});
			} else {
				throw new Error('CogView API请求失败: ' + JSON.stringify(response.data));
			}
		}
		
		return {
			success: true,
			images: generations
		};
	} catch (error) {
		console.error('分镜图生成错误:', error);
		throw error;
	}
};

export {
	analyzeVideo,
	analyzeNarrativeStructure,
	generateNewScript,
	generateStoryboardImages,
	getPrompts,
	setPrompts
};