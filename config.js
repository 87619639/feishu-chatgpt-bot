module.exports = {
    FEISHU_APP_ID: process.env.APPID || '',
    FEISHU_APP_SECRET: process.env.SECRET || '',
    FEISHU_BOTNAME: process.env.BOTNAME || '',
    OPENAI_KEY: process.env.KEY || '',
    OPENAI_MODEL: process.env.MODEL || 'gpt-3.5-turbo',
    OPENAI_MAX_TOKEN: process.env.MAX_TOKEN || 1024
}; 