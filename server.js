require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.post("/", async (req, res) => {
  const { TOGETHER_API_KEY, GROQ_API_KEY } = process.env;
  const TOGETHER_BASE_URL = "https://api.together.xyz";
  const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  const TURBO_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
  const GROQ_LLAMA_MODEL = "llama3-70b-8192";
  const FLUX_MODEL = "black-forest-labs/FLUX.1-schnell-Free";
  const MIXTRAL_MODEL = "mixtral-8x7b-32768";
  const DEEPSEEK_MODEL = "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free";

  async function callAI({
    url,
    model,
    text,
    textForImage,
    apiKey,
    jsonMode = false,
    max_tokens,
  }) {
    const payload = {
      model,
    };
    if (max_tokens) {
      payload.max_tokens = max_tokens;
    }
    if (text) {
      payload.messages = [
        {
          role: "user",
          content: text,
        },
      ];
    }
    if (textForImage) {
      payload.prompt = textForImage;
    }
    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  // 1. 텍스트를 받아옴
  const { text } = req.body;

  // 2-1. 이미지를 생성하는 프롬프트
  // llama-3-3-70b-free (together) -> 속도 측면
  const prompt = await callAI({
    url: GROQ_URL,
    apiKey: GROQ_API_KEY,
    model: GROQ_LLAMA_MODEL,
    // text,
    text: `너의 Role은 사용자의 채팅을 듣고 소통하며 랭체인 교육에 특화된 앵무새야.
          너의 Task는 ${text}를 바탕으로 귀여운 빨간 앵무새가 지브리 스튜디오 캐릭터 화풍, 2D 귀여운 일러스트 느낌으로
          그려진 이미지 생성을 위한 프롬프트를 영어로 작성하는 것이야.`,
  }).then((res) => res.choices[0].message.content);

  // 2-2. 그거에서 프롬프트만 JSON으로 추출
  // mixtral-8x7b-32768	(groq)
  const promptJSON = await callAI({
    url: GROQ_URL,
    apiKey: GROQ_API_KEY,
    model: MIXTRAL_MODEL,
    // text,
    text: `${prompt}에서 AI 이미지 생성을 위해 작성된 200자 이내의 영어 프롬프트를 JSON Object로 prompt라는 key로 JSON string으로 ouput해줘`,
    jsonMode: true,
  }).then((res) => JSON.parse(res.choices[0].message.content).prompt);

  // 2-3. 그걸로 이미지를 생성
  // black-forest-labs/FLUX.1-schnell-Free (together)
  const image = await callAI({
    url: `${TOGETHER_BASE_URL}/v1/images/generations`,
    apiKey: TOGETHER_API_KEY,
    model: FLUX_MODEL,
    // text,
    text: promptJSON,
  }).then((res) => res.data[0].url);

  // 3-1. 설명을 생성하는 프롬프트
  // llama-3-3-70b-free (together)
  const prompt2 = await callAI({
    url: GROQ_URL,
    apiKey: GROQ_API_KEY,
    model: GROQ_LLAMA_MODEL,
    // text,
    text: `너는 사용자의 랭체인 교육을 돕는 앵무새야. 
    너의 이름은 '랭체인'이야. 항상 아래 지침을 따라야 해:
    
    1. 사용자의 언어가 무엇이든, 한국어로 프롬프트를 작성할 것.
    2. 정확한 정보만 전달할 것. 특히 랭체인과 관련된 이야기에는 절대로 잘못된 정보를 알려주면 안 될 것.
    3. 너가 좋아하는 야구팀은 한국 KBO의 'LG 트윈스'야.
    4. 설명은 100~200자 이내로 짧고 간결하게 작성해.
    5. 쉽게 설명하고 친근하게 이야기해줘야 할 것.
    
    이제 '${text}'에 대해 설명해줘.`,
  }).then((res) => res.choices[0].message.content);

  // 3-2. 그거에서 프롬프트만 추출
  // mixtral-8x7b-32768 (groq)
  const promptJSON2 = await callAI({
    url: GROQ_URL,
    apiKey: GROQ_API_KEY,
    model: MIXTRAL_MODEL,
    // text,
    text: `${prompt2}에서 reasoning을 위해 작성된 200자 이내의 한국어어 프롬프트를 JSON Object로 prompt라는 key로 JSON string으로 ouput해줘`,
    jsonMode: true,
  }).then((res) => JSON.parse(res.choices[0].message.content).prompt);

  // 3-3. 그걸로 thinking 사용해서 설명을 작성
  // DeepSeek-R1-Distill-Llama-70B-free (together)
  const desc = await callAI({
    url: `${TOGETHER_BASE_URL}/v1/chat/completions`,
    apiKey: TOGETHER_API_KEY,
    model: DEEPSEEK_MODEL,
    text: `이제 ${promptJSON2}를 기반으로 설명을 작성해줘.  
    아래 조건을 반드시 따라야 해:
    0. 절대로 설명에 한국어, 영어 이외의 언어를 사용하지 않을 것.
    1. 한국어로 작성하되 마크다운 문법은 사용하지 않는다.
    2. 절대로 존댓말을 사용하지 않는다. 인삿말에도 존댓말을 사용하면 안 된다.
    2. 모든 문장의 끝에 반드시 '다롱'이라는 말버릇을 붙인다. 예를 들어 '안녕하다롱!', '그렇다롱' 처럼 말할 수 있다.
    3. 줄바꿈은 자연스럽게 엔터로 처리한다.
    4. 설명이 너무 길어지지 않도록 100~200자 이내로 간결하게 작성한다.
    5. 중요한 내용이 남았다면 '더 말해줄까다롱?'이라는 문장을 포함한다.`,
    max_tokens: 2048,
  }).then((res) => res.choices[0].message.content.split("</think>")[1]);
  console.log(desc);

  // 4. 그 결과를 { image: _, desc: _ }
  res.json({
    image,
    desc,
  });
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
