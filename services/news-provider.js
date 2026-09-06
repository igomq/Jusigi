const config=require('../config');
module.exports=function newsProvider() {
    if(!config.openai.apiKey)return null;
    const OpenAI=require('openai');
    const {model,...options}=config.openai;
    const client=new OpenAI({...options,timeout:10000,maxRetries:0});
    return async()=>{
        const response=await client.chat.completions.create({model,response_format:{type:'json_object'},messages:[{role:'user',content:'게임 속 가상 경제에 대한 일반적인 뉴스 제목(title)과 요약(summary)을 한국어 JSON으로 작성하세요. 특정 회사명이나 주가 방향은 언급하지 마세요.'}]});
        return JSON.parse(response.choices[0].message.content);
    };
};
