require('dotenv').config();
const express = require('express');
const lark = require('@larksuiteoapi/node-sdk');
const axios = require('axios');
const OpenAI = require('openai');

// 添加调试日志
console.log('环境变量检查:');
console.log('APPID:', process.env.APPID);
console.log('SECRET:', process.env.SECRET);
console.log('BOTNAME:', process.env.BOTNAME);
console.log('KEY:', process.env.KEY);
console.log('MODEL:', process.env.MODEL);
console.log('MAX_TOKEN:', process.env.MAX_TOKEN);

// 创建 Express 应用
const app = express();
app.use(express.json());

// 配置信息
const config = {
    FEISHU_APP_ID: process.env.APPID || '',
    FEISHU_APP_SECRET: process.env.SECRET || '',
    FEISHU_BOTNAME: process.env.BOTNAME || '',
    OPENAI_KEY: process.env.KEY || '',
    OPENAI_MODEL: process.env.MODEL || 'gpt-3.5-turbo',
    OPENAI_MAX_TOKEN: process.env.MAX_TOKEN || 1024,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
};

// 初始化 OpenAI
const openai = new OpenAI({
    apiKey: config.OPENAI_KEY,
    baseURL: config.OPENAI_BASE_URL
});

// 初始化飞书客户端
const client = new lark.Client({
    appId: config.FEISHU_APP_ID,
    appSecret: config.FEISHU_APP_SECRET,
    disableTokenCache: false
});

// 使用内存存储替代数据库（生产环境建议使用Redis或数据库）
const eventDB = new Map();
const msgDB = new Map();

// 这里插入之前的所有辅助函数，但需要修改数据库操作相关的代码
// ...

// 添加一个详细的日志函数
function logWebhookData(prefix, data) {
    console.log('\n========== Feishu Webhook Data ==========');
    console.log('Time:', new Date().toISOString());
    console.log('Prefix:', prefix);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('=========================================\n');
}

// 主要的webhook处理路由
app.post('/webhook', async (req, res) => {
    const params = req.body;
    
    // 打印完整的请求数据
    logWebhookData('Incoming Webhook', params);
    
    try {
        // 处理飞书的服务器验证
        if (params.type === 'url_verification') {
            logWebhookData('URL Verification', params);
            return res.json({
                challenge: params.challenge
            });
        }

        // 处理加密配置检查
        if (params.encrypt) {
            console.log("user enable encrypt key");
            return res.json({
                code: 1,
                message: {
                    zh_CN: "你配置了 Encrypt Key，请关闭该功能。",
                    en_US: "You have open Encrypt Key Feature, please close it."
                }
            });
        }

        // 处理消息事件
        if (params.header?.event_type === 'im.message.receive_v1') {
            const eventId = params.header.event_id;
            const messageId = params.event.message.message_id;
            const chatId = params.event.message.chat_id;
            const senderId = params.event.sender.sender_id.user_id;
            const sessionId = chatId + senderId;

            // 打印消息详情
            logWebhookData('Message Details', {
                eventId,
                messageId,
                chatId,
                senderId,
                sessionId,
                messageType: params.event.message.message_type,
                chatType: params.event.message.chat_type,
                content: params.event.message.content
            });

            // 如果是文本消息，打印解析后的内容
            if (params.event.message.message_type === 'text') {
                try {
                    const parsedContent = JSON.parse(params.event.message.content);
                    logWebhookData('Parsed Message Content', parsedContent);
                } catch (e) {
                    logWebhookData('Error Parsing Message Content', {
                        error: e.message,
                        rawContent: params.event.message.content
                    });
                }
            }

            // 检查是否重复事件
            if (eventDB.has(eventId)) {
                console.log("skip repeat event");
                return res.json({ code: 1 });
            }
            eventDB.set(eventId, true);

            // 处理私聊消息
            if (params.event.message.chat_type === 'p2p') {
                if (params.event.message.message_type !== 'text') {
                    await reply(messageId, "暂不支持其他类型的提问");
                    return res.json({ code: 0 });
                }
                const userInput = JSON.parse(params.event.message.content);
                await handleReply(userInput, sessionId, messageId, eventId);
                return res.json({ code: 0 });
            }

            // 处理群聊消息
            if (params.event.message.chat_type === 'group') {
                if (!params.event.message.mentions?.length) {
                    return res.json({ code: 0 });
                }
                if (params.event.message.mentions[0].name !== config.FEISHU_BOTNAME) {
                    return res.json({ code: 0 });
                }
                const userInput = JSON.parse(params.event.message.content);
                await handleReply(userInput, sessionId, messageId, eventId);
                return res.json({ code: 0 });
            }
        }

        res.json({ code: 0 });
    } catch (error) {
        logWebhookData('Error Processing Webhook', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ code: 1, error: 'Internal Server Error' });
    }
});

// 获取 OpenAI 回复
async function getOpenAIReply(prompt) {
    try {
        const completion = await openai.chat.completions.create({
            model: config.OPENAI_MODEL,
            messages: prompt,
            max_tokens: parseInt(config.OPENAI_MAX_TOKEN)
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API error:', error);
        return "抱歉，我遇到了一些问题，请稍后再试。";
    }
}

// 获取 OpenAI 图片
async function getOpenaiImageUrl(prompt) {
    try {
        const response = await openai.images.generate({
            prompt: prompt,
            n: 1,
            size: "1024x1024"
        });
        return response.data[0].url;
    } catch (error) {
        console.error('OpenAI Image API error:', error);
        return "生成图片时出现错误，请稍后重试。";
    }
}

// 自检函数
async function doctor() {
    const config = {
        FEISHU_APP_ID: process.env.APPID || '',
        FEISHU_APP_SECRET: process.env.SECRET || '',
        FEISHU_BOTNAME: process.env.BOTNAME || '',
        OPENAI_KEY: process.env.KEY || '',
        OPENAI_MODEL: process.env.MODEL || 'gpt-3.5-turbo',
        OPENAI_MAX_TOKEN: process.env.MAX_TOKEN || 1024
    };

    if (config.FEISHU_APP_ID === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置飞书应用的 AppID，请检查 & 部署后重试",
                en_US: "Here is no FeiShu APP id, please check & re-Deploy & call again",
            },
        };
    }

    if (!config.FEISHU_APP_ID.startsWith("cli_")) {
        return {
            code: 1,
            message: {
                zh_CN: "你配置的飞书应用的 AppID 是错误的，请检查后重试。飞书应用的 APPID 以 cli_ 开头。",
                en_US: "Your FeiShu App ID is Wrong, Please Check and call again. FeiShu APPID must Start with cli",
            },
        };
    }

    if (config.FEISHU_APP_SECRET === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置飞书应用的 Secret，请检查 & 部署后重试",
                en_US: "Here is no FeiShu APP Secret, please check & re-Deploy & call again",
            },
        };
    }

    if (config.FEISHU_BOTNAME === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置飞书应用的名称，请检查 & 部署后重试",
                en_US: "Here is no FeiShu APP Name, please check & re-Deploy & call again",
            },
        };
    }

    if (config.OPENAI_KEY === "") {
        return {
            code: 1,
            message: {
                zh_CN: "你没有配置 OpenAI 的 Key，请检查 & 部署后重试",
                en_US: "Here is no OpenAI Key, please check & re-Deploy & call again",
            },
        };
    }

    if (!config.OPENAI_KEY.startsWith("sk-")) {
        return {
            code: 1,
            message: {
                zh_CN: "你配置的 OpenAI Key 是错误的，请检查后重试。OpenAI 的 KEY 以 sk- 开头。",
                en_US: "Your OpenAI Key is Wrong, Please Check and call again. OpenAI Key must Start with sk-",
            },
        };
    }

    return {
        code: 0,
        message: {
            zh_CN: "✅ 配置成功，接下来你可以在飞书应用当中使用机器人来完成你的工作。",
            en_US: "✅ Configuration is correct, you can use this bot in your FeiShu App",
        },
        meta: {
            FEISHU_APP_ID: config.FEISHU_APP_ID,
            OPENAI_MODEL: config.OPENAI_MODEL,
            OPENAI_MAX_TOKEN: config.OPENAI_MAX_TOKEN,
            FEISHU_BOTNAME: config.FEISHU_BOTNAME,
        },
    };
}

// 处理回复的函数
async function handleReply(userInput, sessionId, messageId, eventId) {
    try {
        // 记录接收到的用户输入
        logWebhookData('User Input', userInput);

        const question = userInput.text.replace("@_user_1", "").trim();
        
        // 记录处理后的问题
        logWebhookData('Processed Question', { question });

        // 处理命令
        const action = question.trim();
        if (action.startsWith("/")) {
            return await cmdProcess({action, sessionId, messageId});
        }

        // 构建对话历史
        const prompt = await buildConversation(sessionId, question);
        
        // 获取 OpenAI 回复
        const openaiResponse = await getOpenAIReply(prompt);
        
        // 记录 AI 回复
        logWebhookData('AI Response', { openaiResponse });

        // 保存对话历史
        await saveConversation(sessionId, question, openaiResponse);
        
        // 发送回复
        await reply(messageId, openaiResponse);

        // 记录事件处理完成
        logWebhookData('Event Processed', { 
            eventId,
            status: 'success',
            sessionId,
            messageId
        });

        return { code: 0 };
    } catch (error) {
        logWebhookData('Handle Reply Error', {
            error: error.message,
            stack: error.stack,
            userInput,
            sessionId,
            messageId,
            eventId
        });
        
        // 发送错误提示给用户
        await reply(messageId, "处理消息时出现错误，请稍后重试。");
        return { code: 1, error: error.message };
    }
}

// 命令处理函数
async function cmdProcess(cmdParams) {
    logWebhookData('Command Process', cmdParams);

    try {
        if(cmdParams && cmdParams.action.startsWith("/image")){
            const len = cmdParams.action.length;
            const prompt = cmdParams.action.substring(7,len);
            logWebhookData('Image Generation Request', { prompt });
            
            const url = await getOpenaiImageUrl(prompt);
            await reply(cmdParams.messageId, url);
            return { code: 0 };
        }

        switch (cmdParams && cmdParams.action) {
            case "/help":
                await cmdHelp(cmdParams.messageId);
                break;
            case "/clear": 
                await cmdClear(cmdParams.sessionId, cmdParams.messageId);
                break;
            default:
                await cmdHelp(cmdParams.messageId);
                break;
        }
        return { code: 0 };
    } catch (error) {
        logWebhookData('Command Process Error', {
            error: error.message,
            stack: error.stack,
            cmdParams
        });
        await reply(cmdParams.messageId, "执行命令时出现错误，请稍后重试。");
        return { code: 1, error: error.message };
    }
}

// 帮助命令
async function cmdHelp(messageId) {
    const helpText = `ChatGPT 指令使用指南

Usage:
    /clear    清除上下文
    /help     获取更多帮助
    /image [提示词]  根据提示词生成图片
    `;
    await reply(messageId, helpText);
}

// 清除记忆命令
async function cmdClear(sessionId, messageId) {
    await clearConversation(sessionId);
    await reply(messageId, "✅记忆已清除");
}

// 回复消息函数
async function reply(messageId, content) {
    try {
        logWebhookData('Sending Reply', { messageId, content });
        
        return await client.im.message.reply({
            path: {
                message_id: messageId,
            },
            data: {
                content: JSON.stringify({
                    text: content,
                }),
                msg_type: "text",
            },
        });
    } catch(e) {
        logWebhookData('Reply Error', {
            error: e.message,
            stack: e.stack,
            messageId,
            content
        });
    }
}

// 构建对话历史函数
async function buildConversation(sessionId, question) {
    try {
        let prompt = [
            {"role": "system", "content": "You are a helpful assistant."}
        ];
        
        // 从存储中获取历史对话
        const conversations = msgDB.get(sessionId) || [];
        logWebhookData('Retrieved Conversations', { 
            sessionId, 
            conversationCount: conversations.length 
        });

        // 添加历史对话
        for (const conversation of conversations) {
            prompt.push({"role": "user", "content": conversation.question});
            prompt.push({"role": "assistant", "content": conversation.answer});
        }

        // 添加新问题
        prompt.push({"role": "user", "content": question});

        logWebhookData('Built Conversation', { 
            sessionId, 
            promptLength: prompt.length,
            latestQuestion: question
        });

        return prompt;
    } catch (error) {
        logWebhookData('Build Conversation Error', {
            error: error.message,
            stack: error.stack,
            sessionId,
            question
        });
        throw error;
    }
}

// 保存对话历史
async function saveConversation(sessionId, question, answer) {
    try {
        const msgSize = question.length + answer.length;
        const conversation = {
            question,
            answer,
            msgSize,
            timestamp: Date.now()
        };
        
        if (!msgDB.has(sessionId)) {
            msgDB.set(sessionId, []);
        }
        
        const conversations = msgDB.get(sessionId);
        conversations.push(conversation);
        msgDB.set(sessionId, conversations);
        
        logWebhookData('Saved Conversation', {
            sessionId,
            conversationCount: conversations.length,
            latestMsgSize: msgSize
        });

        // 检查是否需要清理旧会话
        await discardConversation(sessionId);
    } catch (error) {
        logWebhookData('Save Conversation Error', {
            error: error.message,
            stack: error.stack,
            sessionId,
            question,
            answer
        });
        throw error;
    }
}

// 清理超出token限制的对话
async function discardConversation(sessionId) {
    try {
        const conversations = msgDB.get(sessionId) || [];
        let totalSize = 0;
        const validConversations = [];
        
        // 从最新的对话开始保留
        for (let i = conversations.length - 1; i >= 0; i--) {
            totalSize += conversations[i].msgSize;
            if (totalSize <= config.OPENAI_MAX_TOKEN) {
                validConversations.unshift(conversations[i]);
            }
        }
        
        msgDB.set(sessionId, validConversations);
        
        logWebhookData('Discarded Old Conversations', {
            sessionId,
            originalCount: conversations.length,
            remainingCount: validConversations.length,
            totalSize
        });
    } catch (error) {
        logWebhookData('Discard Conversation Error', {
            error: error.message,
            stack: error.stack,
            sessionId
        });
        throw error;
    }
}

// 清除历史会话
async function clearConversation(sessionId) {
    try {
        msgDB.delete(sessionId);
        logWebhookData('Cleared Conversation', { sessionId });
    } catch (error) {
        logWebhookData('Clear Conversation Error', {
            error: error.message,
            stack: error.stack,
            sessionId
        });
        throw error;
    }
}

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // 启动时进行自检
    doctor().then(result => {
        console.log('Self-check result:', result);
    });
}); 