<template>
	<view class="container">
		<!-- 左侧工具栏 -->
		<view class="sidebar">
			<view class="logo">
				<view class="logo-content">
					<image src="/static/logo.png" mode="aspectFit"></image>
					<text>AutoReelAnalyzer</text>
				</view>
			</view>

			<view class="tools">
				<view class="history-title">
					<uni-icons type="list" size="18" color="#666"></uni-icons>
					<text>历史记录</text>
				</view>
				
				<!-- 历史记录列表 -->
				<scroll-view class="history-list" scroll-y="true">
					<view v-if="historyRecords.length === 0" class="no-history">
						<text>暂无历史记录</text>
					</view>
					<view v-for="(record, index) in historyRecords" :key="record.id" 
						class="history-item" 
						:class="{ 'active': selectedHistoryId === record.id }"
						@tap="viewHistoryRecord(record.id)">
						<view class="history-item-title">{{ record.title }}</view>
						<view class="history-item-time">{{ new Date(record.timestamp).toLocaleString() }}</view>
						<view class="delete-history" @tap.stop="deleteHistoryRecord(record.id, $event)">
							<uni-icons type="trash" size="16" color="#999"></uni-icons>
						</view>
					</view>
				</scroll-view>
			</view>

			<view class="bottom-tools">
				<view class="tool-item" @click="openSettings">
					<uni-icons type="settings" size="24" color="#333"></uni-icons>
					<text>设置</text>
				</view>
			</view>
		</view>

		<!-- 主内容区 -->
		<view class="main-content">
			<!-- 初始输入界面 -->
			<view v-if="!hasMessages" class="initial-view">
				<view class="center-content">
					<view class="brand">
						<image src="/static/logo.png" mode="aspectFit" class="brand-logo"></image>
						<text class="brand-name">AutoReelAnalyzer</text>
					</view>
					<view class="subtitle">一站式 AI 视频分析引擎，分析更准，创作更容易</view>

					<view class="center-input-container">
						<view class="input-box">
							<!-- 顶部URL显示区域 -->
							<view class="url-section">
								<text class="at-symbol">@</text>
								<text v-if="displayUrl" class="url-text">{{ displayUrl }}</text>
							</view>
							
							<!-- 输入区域 -->
							<view class="input-section">
								<textarea class="message-input" v-model="inputMessage" 
									:placeholder="placeholder"
									@keydown.prevent.enter="sendMessage"
									@confirm="sendMessage"
									:show-confirm-bar="false" 
									auto-height 
									:maxlength="1000"
									:cursor-spacing="20"
									:adjust-position="false"
									disable-default-padding
									:confirm-type="'send'" />
							</view>
							
							<!-- 底部按钮区域 -->
							<view class="action-section">
								<view class="action-left">
									<view class="icon-button settings-button" @tap="toggleSettingsPopup">
										<uni-icons type="gear" size="20" color="#666"></uni-icons>
										
										<!-- 设置选项框 -->
										<view class="settings-dropdown" v-if="showSettingsPopup">
											<view class="setting-item">
												<text class="setting-label">生成步骤 (1-5)</text>
												<view class="step-slider">
													<slider :min="1" :max="5" :value="maxSteps" :step="1" :show-value="true" 
														@change="handleStepChange" />
												</view>
												<view class="step-value">当前步骤: {{ maxSteps }}</view>
											</view>
											
											<!-- 提示词设置按钮 -->
											<view class="setting-item">
												<button class="prompt-button" @tap="openPromptsPopup">修改提示词</button>
											</view>
										</view>
									</view>
								</view>
								<view class="action-right">
									<view class="icon-button" @tap="showVideoUrlInput">
										<uni-icons type="paperclip" size="20" color="#666"></uni-icons>
									</view>
									<view class="icon-button send" @tap="sendMessage">
										<uni-icons type="arrow-right" size="20" color="#1677ff"></uni-icons>
									</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 聊天界面 -->
			<view v-else class="chat-view">
				<view class="chat-header">
					<view class="back-button" @tap="goBack">
						<uni-icons type="back" size="24" color="#333"></uni-icons>
						<text>返回</text>
					</view>
					
					<view v-if="analysisStep > 0" class="process-info">
						<text>步骤 {{analysisStep}}/{{maxSteps}}</text>
					</view>
				</view>
				<scroll-view class="chat-area" scroll-y="true" :scroll-top="scrollTop">
					<view class="messages">
						<view v-for="(message, index) in messages" :key="index" class="message-item"
							:class="message.type">
							
							<!-- 普通消息 -->
							<view class="message-content" v-if="!message.isResult && !message.isLoading">
								<text>{{ message.content }}</text>
							</view>
							
							<!-- 加载中消息 -->
							<view v-if="message.isLoading" class="message-content loading-message">
								<text>{{ message.stepTitle }}</text>
								<view class="loading-dots">
									<text class="dot"></text>
									<text class="dot"></text>
									<text class="dot"></text>
								</view>
							</view>
							
							<!-- 折叠的分析结果 -->
							<view v-if="message.isResult && collapsedMessages[index]" 
								class="collapsed-result" @tap="toggleCollapse(index)">
								<view class="result-header">
									<text>{{ message.stepTitle || '分析结果' }}</text>
									<uni-icons type="bottom" size="16" color="#666"></uni-icons>
								</view>
							</view>
							
							<!-- 展开的分析结果 - 文本 -->
							<view v-if="message.isResult && !collapsedMessages[index] && !message.images" 
								class="expanded-result">
								<view class="result-header" @tap="toggleCollapse(index)">
									<text>{{ message.stepTitle || '分析结果' }}</text>
									<uni-icons type="top" size="16" color="#666"></uni-icons>
								</view>
								<view class="result-content">
									<rich-text :nodes="formatContent(message.content)"></rich-text>
								</view>
							</view>
							
							<!-- 展开的分析结果 - 带图像 -->
							<view v-if="message.isResult && !collapsedMessages[index] && message.images" 
								class="expanded-result">
								<view class="result-header" @tap="toggleCollapse(index)">
									<text>{{ message.stepTitle || '分析结果' }}</text>
									<uni-icons type="top" size="16" color="#666"></uni-icons>
								</view>
								<view class="result-content">
									<view v-for="(img, imgIndex) in message.images" :key="imgIndex" class="storyboard-item">
										<view class="storyboard-prompt">{{ img.prompt }}</view>
										<image :src="img.imageUrl" mode="widthFix" class="storyboard-image"></image>
									</view>
								</view>
							</view>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 视频URL输入弹窗 -->
		<view class="video-url-popup" v-if="showUrlPopup">
			<view class="popup-content">
				<view class="popup-header">
					<text class="popup-title">输入视频URL</text>
					<view class="popup-close" @tap="closeVideoUrlInput">×</view>
				</view>
				<input class="url-input" type="text" v-model="videoUrl" placeholder="请输入视频URL"
					@confirm="confirmVideoUrl" />
				<view class="popup-buttons">
					<button class="cancel-btn" @tap="closeVideoUrlInput">取消</button>
					<button class="confirm-btn" @tap="confirmVideoUrl">确定</button>
				</view>
			</view>
		</view>

		<!-- 设置弹窗 -->
		<view class="settings-popup" v-if="showSettingsPopup">
			<view class="popup-overlay" @tap="closeSettingsPopup"></view>
			<view class="popup-content">
				<view class="popup-header">
					<text class="popup-title">流程设置</text>
					<view class="popup-close" @tap="closeSettingsPopup">×</view>
				</view>
				
				<view class="popup-body">
					<!-- 生成步骤设置 -->
					<view class="setting-item">
						<text class="setting-label">生成步骤 (1-5)</text>
						<view class="step-slider">
							<slider :min="1" :max="5" :value="maxSteps" :step="1" :show-value="true" 
								@change="handleStepChange" />
						</view>
						<view class="step-value">当前步骤: {{ maxSteps }}</view>
					</view>
					
					<!-- 提示词设置按钮 -->
					<view class="setting-item">
						<button class="prompt-button" @tap="openPromptsPopup">修改提示词</button>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 提示词设置弹窗 -->
		<view class="prompts-popup" v-if="showPromptsPopup">
			<view class="popup-overlay" @tap="closePromptsPopup"></view>
			<view class="prompts-content">
				<view class="popup-header">
					<text class="popup-title">提示词设置</text>
					<view class="popup-close" @tap="closePromptsPopup">×</view>
				</view>
				
				<view class="popup-body">
					<!-- 视频分析提示词 -->
					<view class="prompt-item">
						<text class="prompt-label">视频分析提示词</text>
						<textarea class="prompt-textarea" v-model="customPrompts.analysis" 
							placeholder="输入视频分析提示词"
							:maxlength="500"
							auto-height />
					</view>
					
					<!-- 叙事结构分析提示词 -->
					<view class="prompt-item">
						<text class="prompt-label">叙事结构分析提示词</text>
						<textarea class="prompt-textarea" v-model="customPrompts.narrative" 
							placeholder="输入叙事结构分析提示词"
							:maxlength="500"
							auto-height />
					</view>
					
					<!-- 分镜脚本生成提示词 -->
					<view class="prompt-item">
						<text class="prompt-label">分镜脚本生成提示词</text>
						<textarea class="prompt-textarea" v-model="customPrompts.script" 
							placeholder="输入分镜脚本生成提示词"
							:maxlength="500"
							auto-height />
					</view>
					
					<!-- 保存按钮 -->
					<view class="prompt-actions">
						<button class="save-prompts" @tap="savePrompts">保存设置</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 添加设置组件 -->
		<ApiKeySettings v-model="showSettings" @save="handleApiKeySave" />
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		watch,
		onMounted,
		reactive
	} from 'vue'
	import {
		analyzeVideo,
		analyzeNarrativeStructure,
		generateNewScript,
		generateStoryboardImages,
		getPrompts,
		setPrompts
	} from '/api/glm4v.js'
	import ApiKeySettings from '/components/ApiKeySettings.vue'

	const messages = ref([])
	const inputMessage = ref('')
	const scrollTop = ref(0)
	const isLoading = ref(false)
	const showUrlPopup = ref(false)
	const videoUrl = ref('')
	const placeholder = ref('输入内容...')
	const showSettings = ref(false)
	const displayUrl = ref('')
	const currentVideoUrl = ref('')
	const collapsedMessages = ref([])
	
	// 历史记录
	const historyRecords = ref([])
	const selectedHistoryId = ref(null)
	
	// 分析状态
	const analysisStep = ref(0)
	const analysisResults = ref({
		videoAnalysis: '',
		narrativeAnalysis: '',
		scriptGeneration: '',
		storyboardImages: []
	})
	const originalPrompt = ref('')

	const hasMessages = computed(() => messages.value.length > 0)
	
	// 流程设置
	const showSettingsPopup = ref(false)
	const showPromptsPopup = ref(false)
	const maxSteps = ref(5)
	const customPrompts = reactive({
		analysis: '',
		narrative: '',
		script: ''
	})
	
	// 在组件挂载时加载提示词
	onMounted(() => {
		loadHistoryRecords()
		
		// 加载默认提示词
		const prompts = getPrompts()
		customPrompts.analysis = prompts.analysis
		customPrompts.narrative = prompts.narrative
		customPrompts.script = prompts.script
		
		// 添加点击其他区域关闭设置弹窗的事件
		document.addEventListener('click', (event) => {
			const target = event.target;
			if (showSettingsPopup.value && !target.closest('.settings-button') && !target.closest('.settings-dropdown')) {
				showSettingsPopup.value = false;
			}
		});
	})
	
	// 从本地存储加载历史记录
	const loadHistoryRecords = () => {
		try {
			const records = uni.getStorageSync('analysis_history')
			if (records) {
				historyRecords.value = JSON.parse(records)
			}
		} catch (e) {
			console.error('加载历史记录失败:', e)
		}
	}
	
	// 保存历史记录到本地存储
	const saveHistoryRecord = () => {
		try {
			// 如果分析未完成，不保存历史记录
			if (analysisStep.value !== 0 && analysisStep.value !== 5) return;
			
			// 生成唯一ID
			const recordId = Date.now().toString();
			
			// 创建历史记录对象
			const record = {
				id: recordId,
				title: originalPrompt.value.trim() || '视频分析',
				videoUrl: currentVideoUrl.value,
				timestamp: new Date().toISOString(),
				results: analysisResults.value,
				messages: messages.value
			};
			
			// 检查是否已有相同ID的记录（更新而非添加）
			const existingIndex = historyRecords.value.findIndex(r => r.id === recordId);
			if (existingIndex >= 0) {
				historyRecords.value[existingIndex] = record;
			} else {
				// 添加到历史记录
				historyRecords.value.unshift(record);
			}
			
			// 限制历史记录数量
			if (historyRecords.value.length > 20) {
				historyRecords.value = historyRecords.value.slice(0, 20);
			}
			
			// 保存到本地存储
			uni.setStorageSync('analysis_history', JSON.stringify(historyRecords.value));
		} catch (e) {
			console.error('保存历史记录失败:', e);
		}
	};
	
	// 查看历史记录
	const viewHistoryRecord = (recordId) => {
		const record = historyRecords.value.find(r => r.id === recordId)
		if (!record) return
		
		// 设置为当前选中的历史记录
		selectedHistoryId.value = recordId
		
		// 恢复消息记录
		messages.value = [...record.messages]
		
		// 恢复分析结果
		analysisResults.value = { ...record.results }
		
		// 重置分析状态
		analysisStep.value = 0
		isLoading.value = false
	}
	
	// 删除历史记录
	const deleteHistoryRecord = (recordId, event) => {
		// 阻止事件冒泡
		event.stopPropagation()
		
		// 确认删除
		uni.showModal({
			title: '删除确认',
			content: '确定要删除这条历史记录吗？',
			success: (res) => {
				if (res.confirm) {
					// 从列表中删除
					historyRecords.value = historyRecords.value.filter(r => r.id !== recordId)
					
					// 更新本地存储
					uni.setStorageSync('analysis_history', JSON.stringify(historyRecords.value))
					
					// 如果当前正在查看的是被删除的记录，则返回初始页面
					if (selectedHistoryId.value === recordId) {
						goBack()
					}
				}
			}
		})
	}

	const sendMessage = async (e) => {
		// 阻止默认行为
		if (e) {
			e.preventDefault()
		}
		
		// 检查是否有视频链接
		if (!currentVideoUrl.value) {
			uni.showToast({
				title: '请先输入视频链接',
				icon: 'none',
				duration: 2000
			})
			return
		}
		
		// 检查是否有输入内容
		if (!inputMessage.value.trim()) {
			inputMessage.value = '请分析这个视频'
		}

		// 保存原始提示词用于后续步骤
		originalPrompt.value = inputMessage.value.trim()
		
		const messageToSend = inputMessage.value.trim()
		// 组合显示的消息内容，包含@URL
		const displayMessage = messageToSend + " @" + currentVideoUrl.value
		
		messages.value.push({
			type: 'user',
			content: displayMessage
		})

		// 重置分析步骤
		analysisStep.value = 1
		selectedHistoryId.value = null
		runAnalysisProcess()

		// 清空输入框
		inputMessage.value = ''
		displayUrl.value = ''
	}
	
	// 运行多步分析流程
	const runAnalysisProcess = async () => {
		try {
			// 如果超过最大步骤数，则停止处理
			if (analysisStep.value > maxSteps.value) {
				// 完成流程
				analysisStep.value = 0
				isLoading.value = false
				saveHistoryRecord()
				return
			}
			
			// 第一步：视频分析
			if (analysisStep.value === 1) {
				isLoading.value = true;
				messages.value.push({
					type: 'assistant',
					content: '视频分析中',
					isLoading: true,
					stepTitle: '视频分析中'
				});
				scrollToBottom();
				
				const result = await analyzeVideo(originalPrompt.value, currentVideoUrl.value);
				
				// 替换加载消息为结果
				const loadingIndex = messages.value.findIndex(m => m.isLoading);
				if (loadingIndex !== -1) {
					messages.value.splice(loadingIndex, 1);
				}
				
				// 保存分析结果
				analysisResults.value.videoAnalysis = result.response;
				
				// 添加结果消息
				messages.value.push({
					type: 'assistant',
					content: result.response,
					isResult: true,
					resultType: 'video',
					stepTitle: '视频分析结果'
				});
				
				// 默认折叠
				collapsedMessages.value[messages.value.length - 1] = true;
				
				// 进入下一步
				analysisStep.value = 2;
				runAnalysisProcess();
			}
			
			// 第二步：叙事结构分析
			else if (analysisStep.value === 2) {
				messages.value.push({
					type: 'assistant',
					content: '叙事结构分析中',
					isLoading: true,
					stepTitle: '叙事结构分析中'
				});
				scrollToBottom();
				
				const result = await analyzeNarrativeStructure(analysisResults.value.videoAnalysis);
				
				// 替换加载消息
				const loadingIndex = messages.value.findIndex(m => m.isLoading);
				if (loadingIndex !== -1) {
					messages.value.splice(loadingIndex, 1);
				}
				
				// 保存分析结果
				analysisResults.value.narrativeAnalysis = result.response;
				
				// 添加结果消息
				messages.value.push({
					type: 'assistant',
					content: result.response,
					isResult: true,
					resultType: 'narrative',
					stepTitle: '叙事结构分析结果'
				});
				
				// 默认折叠
				collapsedMessages.value[messages.value.length - 1] = true;
				
				// 进入下一步
				analysisStep.value = 3;
				runAnalysisProcess();
			}
			
			// 第三步：生成分镜脚本
			else if (analysisStep.value === 3) {
				messages.value.push({
					type: 'assistant',
					content: '新的分镜脚本生成中',
					isLoading: true,
					stepTitle: '新的分镜脚本生成中'
				});
				scrollToBottom();
				
				const result = await generateNewScript(
					analysisResults.value.videoAnalysis,
					analysisResults.value.narrativeAnalysis,
					originalPrompt.value
				);
				
				// 替换加载消息
				const loadingIndex = messages.value.findIndex(m => m.isLoading);
				if (loadingIndex !== -1) {
					messages.value.splice(loadingIndex, 1);
				}
				
				// 保存分析结果
				analysisResults.value.scriptGeneration = result.response;
				
				// 添加结果消息
				messages.value.push({
					type: 'assistant',
					content: result.response,
					isResult: true,
					resultType: 'script',
					stepTitle: '新的分镜脚本'
				});
				
				// 默认折叠
				collapsedMessages.value[messages.value.length - 1] = true;
				
				// 进入下一步
				analysisStep.value = 4;
				runAnalysisProcess();
			}
			
			// 第四步：分镜图生成
			else if (analysisStep.value === 4) {
				messages.value.push({
					type: 'assistant',
					content: '分镜图生成中',
					isLoading: true,
					stepTitle: '分镜图生成中'
				});
				scrollToBottom();
				
				// 使用分镜脚本生成图像
				const result = await generateStoryboardImages(analysisResults.value.scriptGeneration);
				
				// 替换加载消息
				const loadingIndex = messages.value.findIndex(m => m.isLoading);
				if (loadingIndex !== -1) {
					messages.value.splice(loadingIndex, 1);
				}
				
				// 保存图像结果
				analysisResults.value.storyboardImages = result.images;
				
				// 构建图像展示内容
				let imageContent = '## 分镜图绘制结果\n\n';
				result.images.forEach((img, index) => {
					imageContent += `### 分镜 ${index + 1}\n\n`;
					imageContent += `**提示词**: ${img.prompt}\n\n`;
					imageContent += `![分镜图${index + 1}](${img.imageUrl})\n\n`;
				});
				
				// 添加结果消息
				messages.value.push({
					type: 'assistant',
					content: imageContent,
					isResult: true,
					resultType: 'storyboard',
					stepTitle: '分镜图绘制结果',
					images: result.images
				});
				
				// 默认折叠
				collapsedMessages.value[messages.value.length - 1] = true;
				
				// 进入下一步
				analysisStep.value = 5;
				runAnalysisProcess();
			}
			
			// 第五步：分镜视频生成（占位）
			else if (analysisStep.value === 5) {
				messages.value.push({
					type: 'assistant',
					content: '功能开发中，敬请期待',
					isResult: true,
					resultType: 'placeholder',
					stepTitle: '分镜视频生成中'
				});
				
				// 默认折叠
				collapsedMessages.value[messages.value.length - 1] = true;
				
				// 完成所有步骤
				analysisStep.value = 0;
				isLoading.value = false;
				
				// 整个流程完成后保存历史记录
				saveHistoryRecord();
			}
			
		} catch (error) {
			// 处理错误
			const loadingIndex = messages.value.findIndex(m => m.isLoading);
			if (loadingIndex !== -1) {
				messages.value.splice(loadingIndex, 1);
			}
			
			messages.value.push({
				type: 'assistant',
				content: `步骤${analysisStep.value}执行失败：${error.message || '未知错误'}`,
				isError: true
			});
			
			// 重置步骤
			analysisStep.value = 0;
			isLoading.value = false;
			
			uni.showToast({
				title: error.message || '分析失败',
				icon: 'none'
			});
		}
		
		scrollToBottom();
	}

	// 视频URL输入框相关函数
	const showVideoUrlInput = () => {
		showUrlPopup.value = true
		videoUrl.value = ''
	}

	const closeVideoUrlInput = () => {
		showUrlPopup.value = false
		videoUrl.value = ''
	}

	const confirmVideoUrl = () => {
		if (!videoUrl.value.trim()) {
			uni.showToast({
				title: '请输入视频URL',
				icon: 'none'
			})
			return
		}

		// 检查URL格式
		if (!videoUrl.value.startsWith('http')) {
			uni.showToast({
				title: '请输入有效的URL',
				icon: 'none'
			})
			return
		}

		displayUrl.value = videoUrl.value
		currentVideoUrl.value = videoUrl.value
		closeVideoUrlInput()
	}

	const scrollToBottom = () => {
		setTimeout(() => {
			scrollTop.value = 9999
		}, 100)
	}

	const openSettings = () => {
		console.log('Opening settings...')
		showSettings.value = true
	}

	const handleApiKeySave = (apiKey) => {
		uni.showToast({
			title: 'API Key 已保存',
			icon: 'success'
		})
	}

	const goBack = () => {
		// 清空消息记录
		messages.value = []
		// 清空输入框
		inputMessage.value = ''
		// 清空URL显示
		displayUrl.value = ''
		currentVideoUrl.value = ''
		// 重置分析状态
		analysisStep.value = 0
		selectedHistoryId.value = null
		analysisResults.value = {
			videoAnalysis: '',
			narrativeAnalysis: '',
			scriptGeneration: '',
			storyboardImages: []
		}
	}
	
	// 切换折叠状态
	const toggleCollapse = (index) => {
		if (collapsedMessages.value[index]) {
			collapsedMessages.value[index] = false
		} else {
			collapsedMessages.value[index] = true
		}
	}

	// 修改打开设置弹窗函数
	const toggleSettingsPopup = () => {
		showSettingsPopup.value = !showSettingsPopup.value;
	}

	// 关闭设置弹窗
	const closeSettingsPopup = () => {
		showSettingsPopup.value = false;
	}

	// 打开提示词设置弹窗
	const openPromptsPopup = () => {
		showSettingsPopup.value = false;
		showPromptsPopup.value = true;
	}
	
	// 关闭提示词设置弹窗
	const closePromptsPopup = () => {
		showPromptsPopup.value = false
	}
	
	// 保存提示词设置
	const savePrompts = () => {
		setPrompts({
			analysis: customPrompts.analysis,
			narrative: customPrompts.narrative,
			script: customPrompts.script
		})
		
		uni.showToast({
			title: '提示词已保存',
			icon: 'success'
		})
		
		closePromptsPopup()
	}

	// 处理步骤滑块变化
	const handleStepChange = (e) => {
		maxSteps.value = e.detail.value;
	}

	// 格式化内容，处理markdown样式
	const formatContent = (content) => {
		if (!content) return '';
		
		// 处理标题
		let formatted = content
			.replace(/^# (.*?)$/gm, '<h1>$1</h1>')
			.replace(/^## (.*?)$/gm, '<h2>$1</h2>')
			.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
		
		// 处理段落
		formatted = formatted.replace(/\n\n(.*?)(?=\n\n|$)/gs, '<p>$1</p>');
		
		// 处理粗体和斜体
		formatted = formatted
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>');
		
		// 处理列表
		formatted = formatted
			.replace(/^\- (.*?)$/gm, '<li>$1</li>')
			.replace(/<li>(.*?)<\/li>\n<li>/g, '<li>$1</li><li>')
			.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
		
		// 处理分隔线
		formatted = formatted.replace(/^\-\-\-$/gm, '<hr />');
		
		// 处理单行代码
		formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
		
		// 处理区块引用
		formatted = formatted.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
		
		// 分节显示
		const sections = formatted.split(/\n#{2,3} /);
		if (sections.length > 1) {
			let result = sections[0];
			for (let i = 1; i < sections.length; i++) {
				const sectionContent = sections[i];
				result += `<div class="section">${sectionContent}</div>`;
			}
			formatted = result;
		}
		
		// 处理换行
		formatted = formatted.replace(/\n/g, '<br />');
		
		return formatted;
	};
</script>

<style>
	/* 确保根元素和body占满整个视口 */
	page {
		height: 100%;
		overflow: hidden;
	}

	.container {
		display: flex;
		height: 100vh;
		min-height: 100%;
		background-color: #f5f7fa;
		overflow: hidden;
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
	}

	.sidebar {
		width: 480rpx;
		min-width: 480rpx;
		background-color: #fff;
		display: flex;
		flex-direction: column;
		box-shadow: 2rpx 0 10rpx rgba(0, 0, 0, 0.05);
		height: 100%;
		box-sizing: border-box;
		overflow: hidden;
	}

	.logo {
		height: 120rpx;
		min-height: 120rpx;
		width: 100%;
		display: flex;
		align-items: center;
		padding: 0 40rpx;
		background: #fff;
		position: relative;
		border-bottom: 1px solid #f0f0f0;
		box-sizing: border-box;
	}

	.logo-content {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 100%;
	}

	.logo image {
		width: 56rpx;
		height: 56rpx;
		margin-right: 20rpx;
	}

	.logo text {
		font-size: 36rpx;
		color: #1677ff;
		font-weight: 600;
	}

	.tools {
		flex: 1;
		width: 100%;
		padding: 0;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.history-title {
		display: flex;
		align-items: center;
		padding: 20rpx 40rpx;
		font-size: 28rpx;
		color: #666;
		font-weight: 500;
		gap: 12rpx;
		border-bottom: 1px solid #f0f0f0;
		width: 100%;
		box-sizing: border-box;
	}

	.history-list {
		flex: 1;
		width: 100%;
		padding: 10rpx 0;
		box-sizing: border-box;
		max-height: calc(100% - 100rpx);
	}

	.no-history {
		padding: 40rpx;
		text-align: center;
		color: #999;
		font-size: 26rpx;
	}

	.history-item {
		padding: 20rpx 40rpx;
		border-bottom: 1px solid #f5f5f5;
		cursor: pointer;
		transition: all 0.3s;
		position: relative;
	}

	.history-item:hover {
		background-color: #f9f9f9;
	}

	.history-item.active {
		background-color: #ecf5ff;
	}

	.history-item-title {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 8rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.history-item-time {
		font-size: 24rpx;
		color: #999;
	}

	.delete-history {
		position: absolute;
		right: 20rpx;
		top: 50%;
		transform: translateY(-50%);
		width: 44rpx;
		height: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		opacity: 0;
		transition: all 0.3s;
	}

	.history-item:hover .delete-history {
		opacity: 1;
	}

	.delete-history:hover {
		background-color: #f0f0f0;
	}

	.tool-item {
		width: 80%;
		height: 96rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 40rpx;
		margin-bottom: 8rpx;
		border-radius: 12rpx;
		cursor: pointer;
		transition: all 0.3s;
		box-sizing: border-box;
		gap: 28rpx;
	}

	.tool-item:hover {
		background-color: #f5f7fa;
	}

	.tool-item.active {
		background-color: #ecf5ff;
	}

	.tool-item uni-icons {
		font-size: 24px !important;
	}

	.tool-item text {
		font-size: 32rpx;
		color: #333;
		font-weight: 500;
	}

	.bottom-tools {
		width: 100%;
		padding: 20rpx;
		border-top: 1px solid #f0f0f0;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
	}

	.bottom-tools .tool-item {
		margin-bottom: 0;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
		padding-left: 40rpx;
		box-sizing: border-box;
	}

	.initial-view {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.center-content {
		text-align: center;
		max-width: 100%;
		width: 100%;
		transform: translateY(-15%);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 20rpx;
		box-sizing: border-box;
	}

	.brand {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 40rpx;
	}

	.brand-logo {
		width: 128rpx;
		height: 128rpx;
		margin-right: 32rpx;
	}

	.brand-name {
		font-size: 96rpx;
		font-weight: 600;
		color: #1677ff;
		line-height: 1.2;
	}

	.subtitle {
		font-size: 32rpx;
		color: #666;
		margin-bottom: 80rpx;
		width: 100%;
		text-align: center;
	}

	.center-input-container {
		width: 100%;
		max-width: 1800rpx;
		margin: 0 auto;
		padding: 0 40rpx;
		box-sizing: border-box;
	}

	.input-box {
		background: #fff;
		border-radius: 20rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
		overflow: visible;
		border: 1px solid #e5e5e5;
		position: relative;
		min-height: 160rpx;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	/* URL显示区域 */
	.url-section {
		position: absolute;
		top: 24rpx;
		left: 24rpx;
		display: flex;
		align-items: center;
		gap: 4rpx;
		max-width: 50%;
		z-index: 1;
	}

	.at-symbol {
		font-size: 24rpx;
		color: #999;
		padding-right: 4rpx;
	}

	.url-text {
		font-size: 24rpx;
		color: #666;
		max-width: calc(100% - 30rpx);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* 输入区域 */
	.input-section {
		flex: 1;
		padding: 24rpx;
		padding-top: 88rpx;
	}

	.message-input {
		width: 100%;
		min-height: 40rpx;
		line-height: 40rpx;
		font-size: 28rpx;
		color: #333;
		padding: 0;
		text-align: left;
		word-break: break-all;
		overflow-wrap: break-word;
	}

	/* 按钮区域 */
	.action-section {
		padding: 12rpx 24rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid #f5f5f5;
	}

	.action-right {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.icon-button {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.icon-button:active {
		background-color: #f5f5f5;
	}

	.icon-button.send {
		background-color: #f0f7ff;
	}

	.icon-button.send:active {
		background-color: #e6f0ff;
	}

	/* 移除之前不需要的样式 */
	.button-text {
		display: none;
	}

	.chat-view {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 30rpx;
	}

	.chat-header {
		height: 88rpx;
		display: flex;
		align-items: center;
		padding: 0 20rpx;
		margin-bottom: 20rpx;
	}

	.back-button {
		display: flex;
		align-items: center;
		padding: 10rpx 20rpx;
		border-radius: 8rpx;
		cursor: pointer;
		transition: all 0.3s;
	}

	.back-button:active {
		background-color: #f5f5f5;
	}

	.back-button text {
		font-size: 28rpx;
		color: #333;
		margin-left: 8rpx;
	}

	.chat-area {
		flex: 1;
		background-color: #fff;
		border-radius: 20rpx;
		margin-bottom: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.04);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 24rpx 30rpx;
	}

	.message-item {
		margin-bottom: 28rpx;
		display: flex;
		flex-direction: column;
		animation: fadeIn 0.3s ease-out;
		position: relative;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10rpx);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.message-item.user {
		align-items: flex-end;
	}

	.message-content {
		max-width: 70%;
		padding: 24rpx 28rpx;
		border-radius: 16rpx;
		background-color: #f5f7fa;
		color: #333;
		font-size: 28rpx;
		line-height: 1.6;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.03);
	}

	.message-content text {
		white-space: pre-wrap;
		word-break: break-all;
		display: block;
	}

	.message-item.user .message-content {
		background-color: #3f8dfd;
		color: #fff;
		box-shadow: 0 2rpx 10rpx rgba(63, 141, 253, 0.2);
		border: none;
	}

	.loading-message {
		display: flex;
		align-items: center;
		gap: 16rpx;
		background-color: #f5f7fa;
		padding: 24rpx 28rpx;
		border-radius: 16rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
		max-width: 70%;
	}

	.loading-dots {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.dot {
		width: 10rpx;
		height: 10rpx;
		background-color: #3f8dfd;
		border-radius: 50%;
		animation: dotPulse 1.4s infinite ease-in-out;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes dotPulse {
		0%, 80%, 100% {
			transform: scale(0);
			opacity: 0.2;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.collapsed-result {
		background-color: #f5f7fa;
		padding: 0;
		border-radius: 16rpx;
		max-width: 70%;
		cursor: pointer;
		overflow: hidden;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.08);
		border: 1px solid rgba(0, 0, 0, 0.03);
	}

	.expanded-result {
		background-color: #f5f7fa;
		border-radius: 16rpx;
		max-width: 70%;
		overflow: hidden;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.08);
		border: 1px solid rgba(0, 0, 0, 0.03);
		margin-bottom: 8rpx;
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24rpx 28rpx;
		background-color: #edf1f7;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.result-header:hover {
		background-color: #e5ebf5;
	}

	.result-header text {
		font-size: 28rpx;
		font-weight: 500;
		color: #404b5c;
	}

	.result-content {
		padding: 24rpx 28rpx;
	}

	.result-content text {
		white-space: pre-wrap;
		word-break: break-all;
		display: block;
		font-size: 28rpx;
		line-height: 1.6;
		color: #333;
	}
	
	/* 改善长文本排版 */
	.result-content p {
		margin-bottom: 16rpx;
		line-height: 1.6;
	}
	
	.result-content h1, .result-content h2, .result-content h3 {
		margin-top: 30rpx;
		margin-bottom: 20rpx;
		font-weight: 600;
		color: #333;
	}
	
	.result-content h1 {
		font-size: 36rpx;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		padding-bottom: 16rpx;
	}
	
	.result-content h2 {
		font-size: 32rpx;
	}
	
	.result-content h3 {
		font-size: 28rpx;
	}
	
	.result-content ul, .result-content ol {
		padding-left: 40rpx;
		margin-bottom: 20rpx;
	}
	
	.result-content li {
		margin-bottom: 10rpx;
	}
	
	.result-content blockquote {
		border-left: 4rpx solid #3f8dfd;
		padding: 12rpx 20rpx;
		margin: 20rpx 0;
		background-color: rgba(63, 141, 253, 0.08);
		color: #4a4a4a;
	}
	
	.result-content code {
		background-color: #f0f0f0;
		padding: 4rpx 8rpx;
		border-radius: 4rpx;
		font-family: monospace;
	}
	
	.result-content pre {
		background-color: #f5f5f5;
		padding: 16rpx;
		border-radius: 8rpx;
		overflow-x: auto;
		margin: 20rpx 0;
	}
	
	/* 段落缩进和分隔 */
	.result-content .section {
		margin-bottom: 30rpx;
		padding-bottom: 20rpx;
		border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
	}
	
	.result-content .section:last-child {
		border-bottom: none;
	}
	
	.result-content .highlight {
		background-color: rgba(255, 230, 0, 0.2);
		padding: 2rpx 6rpx;
	}
	
	.result-content .note {
		display: block;
		padding: 16rpx;
		background-color: #edf1f7;
		border-radius: 8rpx;
		margin: 16rpx 0;
	}

	.process-info {
		margin-left: auto;
		padding: 10rpx 20rpx;
		background-color: #f0f7ff;
		border-radius: 40rpx;
		font-size: 24rpx;
		color: #3f8dfd;
		font-weight: 500;
		box-shadow: 0 2rpx 8rpx rgba(63, 141, 253, 0.15);
		border: 1px solid rgba(63, 141, 253, 0.1);
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.process-info:before {
		content: '';
		display: inline-block;
		width: 8rpx;
		height: 8rpx;
		background-color: #3f8dfd;
		border-radius: 50%;
	}

	.storyboard-item {
		margin-bottom: 30rpx;
		border: none;
		border-radius: 16rpx;
		overflow: hidden;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}
	
	.storyboard-item:hover {
		transform: translateY(-4rpx);
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
	}
	
	.storyboard-prompt {
		padding: 20rpx 24rpx;
		background-color: #edf1f7;
		font-size: 26rpx;
		color: #404b5c;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		font-weight: 500;
	}
	
	.storyboard-image {
		width: 100%;
		height: auto;
		display: block;
	}

	/* 聊天区域样式优化 */
	.chat-area {
		flex: 1;
		background-color: #fff;
		border-radius: 20rpx;
		margin-bottom: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.04);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 24rpx 30rpx;
	}

	/* 视频URL输入弹窗样式 */
	.video-url-popup {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.popup-content {
		background-color: #fff;
		border-radius: 16rpx;
		width: 600rpx;
		padding: 40rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
	}

	.popup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 40rpx;
	}

	.popup-title {
		font-size: 32rpx;
		font-weight: 500;
		color: #333;
	}

	.popup-close {
		width: 44rpx;
		height: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
		color: #999;
		cursor: pointer;
		border-radius: 50%;
		transition: all 0.3s;
	}

	.popup-close:hover {
		background-color: #f5f5f5;
	}

	.url-input {
		width: 100%;
		height: 88rpx;
		border: 2rpx solid #e5e5e5;
		border-radius: 8rpx;
		padding: 0 24rpx;
		font-size: 28rpx;
		margin-bottom: 40rpx;
		box-sizing: border-box;
		transition: all 0.3s;
	}

	.url-input:focus {
		border-color: #1677ff;
		box-shadow: 0 0 0 2rpx rgba(22, 119, 255, 0.1);
	}

	.url-input::placeholder {
		color: #999;
	}

	.popup-buttons {
		display: flex;
		justify-content: flex-end;
		gap: 20rpx;
	}

	.cancel-btn,
	.confirm-btn {
		min-width: 160rpx;
		height: 72rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8rpx;
		font-size: 28rpx;
		transition: all 0.3s;
		border: none;
		cursor: pointer;
	}

	.cancel-btn {
		background-color: #f5f5f5;
		color: #666;
	}

	.cancel-btn:hover {
		background-color: #e8e8e8;
	}

	.confirm-btn {
		background-color: #1677ff;
		color: #fff;
	}

	.confirm-btn:hover {
		background-color: #0e5edb;
	}

	/* 设置弹窗样式 */
	.settings-popup, .prompts-popup {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.popup-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
	}
	
	.popup-content {
		position: relative;
		width: 600rpx;
		background-color: #fff;
		border-radius: 16rpx;
		overflow: hidden;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
		z-index: 1;
	}
	
	.prompts-content {
		position: relative;
		width: 80%;
		max-width: 900rpx;
		max-height: 80vh;
		background-color: #fff;
		border-radius: 16rpx;
		overflow: hidden;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
		z-index: 1;
		display: flex;
		flex-direction: column;
	}
	
	.popup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24rpx 30rpx;
		border-bottom: 1px solid #f0f0f0;
	}
	
	.popup-title {
		font-size: 32rpx;
		font-weight: 500;
		color: #333;
	}
	
	.popup-close {
		width: 48rpx;
		height: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
		color: #999;
		cursor: pointer;
		border-radius: 50%;
		transition: all 0.3s;
	}
	
	.popup-close:hover {
		background-color: #f5f5f5;
	}
	
	.popup-body {
		padding: 30rpx;
		max-height: 70vh;
		overflow-y: auto;
	}
	
	.setting-item {
		margin-bottom: 30rpx;
	}
	
	.setting-label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 16rpx;
	}
	
	.step-slider {
		margin: 20rpx 0;
		width: 100%;
		box-sizing: border-box;
	}
	
	.step-slider slider {
		width: 100%;
		margin: 0 auto;
		display: block;
	}
	
	.prompt-button {
		width: 100%;
		height: 80rpx;
		background-color: #f5f7fa;
		border: 1px solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 28rpx;
		color: #333;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.prompt-item {
		margin-bottom: 24rpx;
	}
	
	.prompt-label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 12rpx;
	}
	
	.prompt-textarea {
		width: 100%;
		min-height: 200rpx;
		padding: 20rpx;
		border: 1px solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 26rpx;
		box-sizing: border-box;
		background-color: #f9f9f9;
	}
	
	.prompt-actions {
		margin-top: 40rpx;
		display: flex;
		justify-content: flex-end;
	}
	
	.save-prompts {
		width: 240rpx;
		height: 80rpx;
		background-color: #1677ff;
		color: #fff;
		border-radius: 8rpx;
		font-size: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* 修改设置按钮样式 */
	.settings-button {
		position: relative;
		z-index: 20001;
	}

	/* 修改设置弹窗样式为下拉菜单 */
	.settings-dropdown {
		position: absolute;
		bottom: 100%;
		left: -20rpx;
		width: 600rpx;
		background-color: #fff;
		border-radius: 12rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.25);
		padding: 30rpx;
		margin-bottom: 16rpx;
		z-index: 20000;
		animation: slideUp 0.2s ease-out;
		transform-origin: bottom left;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	@keyframes slideUp {
		from {
			transform: translateY(10rpx);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	/* 添加小三角形箭头 */
	.settings-dropdown:after {
		content: '';
		position: absolute;
		bottom: -16rpx;
		left: 20rpx;
		border-width: 8rpx;
		border-style: solid;
		border-color: #fff transparent transparent transparent;
		filter: drop-shadow(0 2rpx 2rpx rgba(0, 0, 0, 0.1));
	}

	/* 修改设置弹窗 */
	.settings-popup {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		display: none; /* 隐藏全局遮罩弹窗 */
	}

	.step-value {
		font-size: 26rpx;
		color: #666;
		text-align: center;
		margin-top: 10rpx;
	}
</style>