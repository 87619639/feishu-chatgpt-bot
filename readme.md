# 飞书 ChatGPT 机器人

一个基于 OpenAI API 的飞书机器人，支持私聊和群聊，支持消息上下文记忆，支持图片生成功能。

## 功能特性

- 🤖 支持与 ChatGPT 对话
- 💭 支持上下文记忆功能
- 🖼️ 支持 DALL-E 图片生成
- 👥 支持私聊及群组对话
- 📝 完善的日志系统
- 🔄 自动化的会话管理
- 🛡️ 内置自检功能

## 命令列表

- `/help` - 显示帮助信息
- `/clear` - 清除上下文记忆
- `/image [提示词]` - 生成图片

## 部署指南

### 环境要求

- Node.js 18+
- Docker（可选）
- 飞书开放平台账号
- OpenAI API 密钥

### 配置飞书机器人

1. 前往[飞书开放平台](https://open.feishu.cn/)创建应用
2. 获取应用凭证（App ID 和 App Secret）
3. 在"权限管理"中开启以下权限：
   - `im:message`
   - `im:message.group_at_msg`
   - `im:message.p2p_msg`
![image](https://github.com/user-attachments/assets/df59829f-baaa-4e21-af15-b4a14c87e5da)

4. 在"机器人"功能中启用机器人
![Uploading image.png…]()

6. 配置消息卡片请求网址：`http://您的域名:9002/webhook`
7. 添加事件
![image](https://github.com/user-attachments/assets/b4cba316-1546-4cf2-bf8a-7602f1a5b890)


### 本地部署

1. 克隆仓库

git clone https://github.com/您的用户名/仓库名.git
cd 仓库名

2. 安装依赖

```bash
npm install
```
3. 配置环境变量

```bash
cp .env.example .env
```
编辑 `.env` 文件，填入必要的配置信息：
env
APPID=您的飞书应用ID
SECRET=您的飞书应用Secret
BOTNAME=ChatGPT
KEY=您的OpenAI API密钥
MODEL=gpt-4
MAX_TOKEN=4096
PORT=9002
OPENAI_BASE_URL=https://api.openai.com/v1

4. 启动应用

```bash
npm start
```
### Docker 部署

1. 构建并启动容器

```bash
docker-compose up -d
```
2. 查看日志
```
docker-compose logs -f
```

3. 停止并删除容器

```bash
docker-compose down
```


## 配置说明

### 环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| APPID | 飞书应用 ID | cli_xxxxxx |
| SECRET | 飞书应用 Secret | xxxxxx |
| BOTNAME | 机器人名称 | ChatGPT |
| KEY | OpenAI API 密钥 | sk-xxxxxx |
| MODEL | GPT 模型 | gpt-4 |
| MAX_TOKEN | 最大 token 数 | 4096 |
| PORT | 服务端口 | 9002 |
| OPENAI_BASE_URL | OpenAI API 地址 | https://api.openai.com/v1 |

## 使用说明

### 私聊

直接与机器人私聊即可开始对话。

### 群聊

在群聊中 @ 机器人即可开始对话。

### 图片生成

使用 `/image` 命令followed by 提示词来生成图片：

```bash
/image 一只可爱的小猫
```


### 清除上下文

使用 `/clear` 命令可以清除当前会话的上下文记忆。

## 常见问题

1. **机器人不回复**
   - 检查环境变量配置
   - 确认飞书机器人权限是否正确
   - 查看应用日志排查问题

2. **OpenAI API 报错**
   - 确认 API 密钥是否正确
   - 检查 API 余额
   - 确认是否使用了正确的 API 地址

3. **上下文失效**
   - 检查 MAX_TOKEN 配置
   - 使用 `/clear` 命令清除历史记录后重试

## 安全建议

1. 不要在代码仓库中提交 `.env` 文件
2. 定期更换 API 密钥
3. 使用 HTTPS 进行 API 调用
4. 建议配置 API 调用频率限制

## 贡献指南

欢迎提交 Pull Request 或 Issue！

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或联系：[876196639@qq.com]


# 更多交流

遇到问题，可以加入飞书群沟通~
![img_v3_02hv_e20f8b77-f288-4935-9eb9-25a82273419g](https://github.com/user-attachments/assets/bb117cbc-b0ab-454e-b1f7-17c48f92aa14)

