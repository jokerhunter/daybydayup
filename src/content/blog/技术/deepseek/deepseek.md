---
title: 'DeepSeek 使用笔记：API 调用与本地部署'
description: '从 OpenAI 兼容 API 到 Ollama 本地部署，一份 DeepSeek 实战速查笔记。'
pubDate: 2026-08-17
---

DeepSeek 的模型以「性能强、价格低、开源友好」著称，日常开发中我经常用它做翻译、代码补全和长文总结。这篇文章整理我的使用笔记，方便日后速查。

## 为什么选 DeepSeek

- **API 完全兼容 OpenAI 格式**：现有的 OpenAI SDK 代码只需改 `baseURL` 和模型名即可迁移；
- **推理模型**：`deepseek-reasoner`（R1）会把思考过程作为 `reasoning_content` 返回，适合数学、代码等需要深度推理的任务；
- **开源权重**：可以本地部署，数据不出内网。

## 一、API 调用

### 前置准备

在 [platform.deepseek.com](https://platform.deepseek.com/) 创建 API Key，然后设置环境变量：

```bash
export DEEPSEEK_API_KEY="sk-xxxx"
```

### 基础对话

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "system", "content": "你是一个严谨的技术助手。"},
      {"role": "user", "content": "用一句话解释什么是内容寻址。"}
    ]
  }'
```

模型名二选一：

| 模型 | 用途 | 特点 |
| --- | --- | --- |
| `deepseek-chat` | 日常对话、翻译、总结 | 响应快、成本低 |
| `deepseek-reasoner` | 推理、代码、数学 | 返回思考链，慢但准 |

### 用 OpenAI SDK 调用

DeepSeek 兼容 OpenAI 协议，Node.js 里几乎零成本迁移：

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const res = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: '你是代码评审助手。' },
    { role: 'user', content: 'review 这段代码：...' },
  ],
  stream: true, // 流式输出
});

for await (const chunk of res) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}
```

## 二、本地部署

用 [Ollama](https://ollama.com) 跑蒸馏版 R1，适合离线场景和敏感数据：

```bash
# 安装 Ollama 后拉取模型
ollama run deepseek-r1:7b

# 或更大规模（需要更多显存）
ollama run deepseek-r1:14b
```

本地服务的接口同样是 OpenAI 兼容的（默认 `http://localhost:11434/v1`），把上面的 `baseURL` 换成它即可复用同一套代码。

> 硬件参考：7B 模型量化后约需 8GB 显存，14B 建议 16GB 以上；纯 CPU 也能跑但速度明显下降。

## 三、几个实用技巧

- **推理模型不用调 temperature**：`deepseek-reasoner` 会忽略 temperature，思考质量由模型本身决定；
- **拿回思考链**：reasoner 的响应里 `reasoning_content` 字段是思考过程，做「解题过程展示」类产品时很有用；
- **系统提示词尽量明确**：DeepSeek 对 system prompt 的遵循度不错，把角色、边界、输出格式写清楚能省很多后处理；
- **长文本先总结再处理**：超过 16K 的输入，先让它做分段摘要，再基于摘要工作，成本和质量都更稳。

## 小结

DeepSeek 最舒服的地方是「生态兼容」：OpenAI SDK、Ollama、各种编排框架都能无缝接上，切换成本极低。日常任务用 `deepseek-chat` 求快，复杂推理切 `deepseek-reasoner` 求准，敏感场景用 Ollama 本地跑——一套代码覆盖三种场景。
