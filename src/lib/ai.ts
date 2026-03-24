import axios from 'axios';
import { prisma } from './db';
import { createStream, appendChunk, finalizeStream } from './streamStore';

function getFullEndpoint(endpoint: string) {
  let url = endpoint.trim();
  if (!url.endsWith('/chat/completions')) {
    if (url.endsWith('/')) url += 'chat/completions';
    else if (url.endsWith('/v1')) url += '/chat/completions';
    else url = url.replace(/\/+$/, '') + '/chat/completions';
  }
  return url;
}

async function callAI(config: any, messages: any[], timeout: number, retries = 3): Promise<any> {
  const url = getFullEndpoint(config.endpoint);
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, {
        model: config.model,
        messages,
        stream: false,
      }, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
        timeout
      });
      if (!response.data || !response.data.choices || response.data.choices.length === 0) {
        throw new Error(`Invalid AI response: ${JSON.stringify(response.data)}`);
      }
      return response.data;
    } catch (err: any) {
      if (err.response) {
        lastError = new Error(`AI API Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      } else if (err.request) {
        lastError = new Error(`AI Network Error: No response received`);
      } else {
        lastError = err;
      }
    }
  }
  throw lastError;
}

export async function checkInjection(_text: string) {
  return true;
}

function buildMessages(title: string, text: string, standard: string, essayImages: string[], topicImages: string[], fullScore: number, extraPrompt: string, language: string = '中文') {
  const systemPrompt = `You are an expert English essay scorer. Score the essay according to the "${standard}" standard with a maximum score of ${fullScore}.
${extraPrompt ? `Additional instructions: ${extraPrompt}` : ''}

CRITICAL INSTRUCTION: You MUST format your response EXACTLY as the template below. Use the exact section headers. Do NOT use JSON.

--- SCORE ---
<Provide ONLY the numerical score here, e.g., 85.5>

--- SUMMARY ---
<Provide a one-line catchy title/summary for the essay in ${language}>

--- OVERALL ---
<Provide the overall feedback and evaluation in ${language}>

--- DETAILS ---
<Provide detailed analysis by aspects (e.g., Grammar, Vocabulary, Logic) in ${language}. Use markdown.>

--- SUGGESTIONS ---
<Provide specific improvement suggestions in ${language}, one per line starting with a bullet point (-)>

--- REVISED ---
<Provide a revised version of the user's essay in English. Crucially, mark EVERY correction using: <delete>wrong text</delete><add>corrected text</add>. Keep the rest unchanged.>

--- IMPROVED ---
<Provide a high-quality model essay based on the same topic in English, significantly improving vocabulary, sentence structures, and depth.>
`;

  const userContent: any[] = [];
  if (topicImages && topicImages.length > 0) {
    userContent.push({ type: 'text', text: 'Essay topic image(s):' });
    for (const url of topicImages) userContent.push({ type: 'image_url', image_url: { url } });
  }
  if (title) userContent.push({ type: 'text', text: `Topic: ${title}` });
  if (essayImages && essayImages.length > 0) {
    userContent.push({ type: 'text', text: 'Essay image(s):' });
    for (const url of essayImages) userContent.push({ type: 'image_url', image_url: { url } });
  }
  if (text) userContent.push({ type: 'text', text: `Essay:\n${text}` });

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent.length === 1 && userContent[0].type === 'text' ? userContent[0].text : userContent },
  ];
}

function parseTaggedContent(content: string) {
  const extract = (sectionName: string) => {
    const regex = new RegExp(`--- ${sectionName} ---\\s*([\\s\\S]*?)(?=\\n--- |$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };

  // Fallback for old tag format just in case
  const extractOld = (tag: string) => {
    const startTag = `[${tag}]`;
    const endTag = `[/${tag}]`;
    const startIndex = content.indexOf(startTag);
    const endIndex = content.indexOf(endTag);
    if (startIndex === -1 || endIndex === -1) return '';
    return content.substring(startIndex + startTag.length, endIndex).trim();
  };

  const safeExtract = (name: string) => extract(name) || extractOld(name);

  const scoreText = safeExtract('SCORE');
  // Handle cases where AI might output "Score: 85" instead of just "85"
  const scoreMatch = scoreText.match(/[\d.]+/);
  const score = scoreMatch ? parseFloat(scoreMatch[0]) : 0;
  
  const summary = safeExtract('SUMMARY');
  const overall = safeExtract('OVERALL');
  const detailsRaw = safeExtract('DETAILS');
  const suggestionsRaw = safeExtract('SUGGESTIONS');
  const revised = safeExtract('REVISED');
  const improved = safeExtract('IMPROVED');

  const suggestions = suggestionsRaw.split('\n').map(s => s.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);

  return {
    score,
    summary,
    overall,
    details: [{ aspect: '详细分析', comment: detailsRaw }],
    suggestions,
    revised,
    improved
  };
}

export async function scoreEssay(
  title: string,
  text: string,
  configId: string,
  standard: string,
  essayImages: string[],
  topicImages: string[],
  fullScore: number,
  language: string = '中文'
) {
  const config = await prisma.aIConfig.findUnique({ where: { id: configId } });
  if (!config) throw new Error('找不到 AI 配置');

  const category = await prisma.categoryConfig.findFirst({ where: { name: standard } });
  const extraPrompt = category?.extraPrompt || '';

  const messages = buildMessages(title, text, standard, essayImages, topicImages, fullScore, extraPrompt, language);
  const data = await callAI(config, messages, 120000);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI Response invalid');

  return parseTaggedContent(content);
}

// Streaming version: writes chunks to streamStore then updates DB when done
export async function scoreEssayStream(
  submissionId: string,
  title: string,
  text: string,
  configId: string,
  standard: string,
  essayImages: string[],
  topicImages: string[],
  fullScore: number,
  language: string = '中文',
  creditCost: number = 0
) {
  const config = await prisma.aIConfig.findUnique({ where: { id: configId } });
  if (!config) {
    finalizeStream(submissionId, '找不到 AI 配置');
    throw new Error('找不到 AI 配置');
  }

  const category = await prisma.categoryConfig.findFirst({ where: { name: standard } });
  const extraPrompt = category?.extraPrompt || '';
  const messages = buildMessages(title, text, standard, essayImages, topicImages, fullScore, extraPrompt, language);

  createStream(submissionId);

  const startTime = Date.now();
  let fullText = '';
  try {
    const url = getFullEndpoint(config.endpoint);
    const response = await axios.post(url, {
      model: config.model,
      messages,
      stream: true,
    }, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      responseType: 'stream',
      timeout: 180000,
    });

    await new Promise<void>((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              appendChunk(submissionId, delta);
            }
          } catch { /* ignore parse errors on partial chunks */ }
        }
      });
      response.data.on('end', resolve);
      response.data.on('error', reject);
    });

    const parsed = parseTaggedContent(fullText);
    const duration = Date.now() - startTime;
    
    // Safety check: if AI output is empty or completely failed to parse essential fields
    if (!parsed.score && !parsed.overall && !parsed.revised) {
       throw new Error(JSON.stringify({ msg: 'AI 返回内容无法解析或为空，已触发退款', raw: fullText }));
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: parsed.score,
        summary: parsed.summary,
        feedback: JSON.stringify(parsed),
        status: 'DONE',
        responseTime: Math.floor(duration / 1000) // Store in seconds or ms? Let's use seconds for simpler display or ms for precision. User asked for average, let's use ms.
      },
    });
    finalizeStream(submissionId);
  } catch (err: any) {
    let errMsg = err?.message || 'Unknown error';
    let rawContent = '';
    try {
      if (errMsg.startsWith('{')) {
        const parsedErr = JSON.parse(errMsg);
        if (parsedErr.msg) {
          errMsg = parsedErr.msg;
          rawContent = parsedErr.raw || '';
        }
      }
    } catch (e) {
      // Not JSON, ignore
    }

    console.error(`[Refund Logic] Submission ${submissionId} failed: ${errMsg}. Refunding ${creditCost} credits.`);
    
    try {
      // 1. Mark submission as error, store rawContent in feedback for admin debug
      const submission = await prisma.submission.update({
        where: { id: submissionId },
        data: { 
          status: 'ERROR', 
          error: errMsg,
          feedback: rawContent ? rawContent : null
        },
      });

      // 2. Refund credits
      if (creditCost > 0) {
        await prisma.user.update({
          where: { id: submission.userId },
          data: { credits: { increment: creditCost } }
        });
      }
    } catch (dbErr) {
      console.error('Critical Error: Failed to process refund in DB:', dbErr);
    }
    
    finalizeStream(submissionId, errMsg);
    throw err;
  }
}
