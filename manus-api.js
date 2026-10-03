(function(root){
  'use strict';
  const defaults={provider:'manus',mode:'async',base:'https://api.manus.ai/v2',createPath:'/task.create',queryPath:'/task.detail?task_id={task_id}',auth:'x-manus-api-key',format:'pptx',taskField:'task_id',statusField:'task.status',downloadField:'自动读取生成附件',profile:'standard'};
  function safeUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}}
  function headers(s){return s.auth==='bearer'?{'Content-Type':'application/json',Authorization:'Bearer '+s.key}:{'Content-Type':'application/json','x-manus-api-key':s.key}}
  function endpoint(s,path){return s.base.replace(/\/+$/,'')+'/'+path.replace(/^\/+/, '')}
  function check(data){if(!data||data.ok!==true)throw new Error(data?.error?.message||'Manus返回了无效响应');return data}
  function payload(spec,s){
    if(!spec.outline?.length)throw new Error('请先确认完整的逐页PPT大纲');
    const text=JSON.stringify(spec,null,2),bytes=new TextEncoder().encode(text);
    if(bytes.length>20*1024*1024)throw new Error('大纲附件超过Manus的20MB限制');
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const prompt='你是教师备课工作台的PPT制作师。请读取附件 confirmed-outline.json，它是教师已经确认的逐页教学大纲和视觉设置。只负责制作，不重新设计课程，不增加、删除知识点，不改变难度或题目答案。每页严格落实 title、body、code、visual、layout、interaction、speaker_notes、minutes 等字段；完整保留C++代码、公式和中文文字，不用占位语。按 options 中的风格、比例、配图、代码主题、教师备注要求制作可编辑PPTX并交付真实文件附件。模板ID仅作为服务商模板参考，若无法使用，请按版式说明制作，不假装套用了模板。转场和字体嵌入若工具不支持，在结果中明确说明。'+(s.format==='pdf'?'另外导出PDF附件。':'')+'最终务必交付文件，不只返回描述、代码或示例。不要公开分享此任务。';
    return {title:spec.title+' · 课堂PPT',locale:'zh-CN',interactive_mode:false,share_visibility:'private',agent_profile:s.profile||'standard',message:{content:[{type:'text',text:prompt,visibility:'visible'},{type:'file',filename:'confirmed-outline.json',mime_type:'application/json',file_data:'data:application/json;base64,'+btoa(binary),visibility:'visible'}]}};
  }
  async function create(request,s,spec){return check(await request({url:endpoint(s,s.createPath||defaults.createPath),method:'POST',headers:headers(s),body:payload(spec,s)}))}
  async function inspect(request,s,id){const path=(s.queryPath||defaults.queryPath).replace('{task_id}',encodeURIComponent(id));const data=check(await request({url:endpoint(s,path),method:'GET',headers:headers(s)}));if(!data.task)throw new Error('Manus响应缺少task字段');return data.task}
  async function files(request,s,id){
    let cursor='';const output=[],seen=new Set();
    for(let page=0;page<20;page++){
      const q=new URLSearchParams({task_id:id,order:'desc',limit:'200',slides_format:'pptx'});if(cursor)q.set('cursor',cursor);
      const data=check(await request({url:endpoint(s,'/task.listMessages?'+q),method:'GET',headers:headers(s)}));
      for(const m of data.messages||[]){if(m.type!=='assistant_message')continue;for(const a of m.assistant_message?.attachments||[]){const url=safeUrl(a.url),name=String(a.filename||'');const ext=/\.pptx$/i.test(name)||/presentationml/.test(a.content_type||'')||a.type==='slides'?'pptx':/\.pdf$/i.test(name)||a.content_type==='application/pdf'?'pdf':null;if(url&&ext&&!seen.has(url)){seen.add(url);output.push({url,name:name||('课堂PPT.'+ext),format:ext})}}}
      if(!data.has_more||!data.next_cursor) return output;
      if(cursor===data.next_cursor)throw new Error('Manus附件分页游标未前进');cursor=data.next_cursor;
    }
    throw new Error('任务消息过多，请在Manus任务页下载附件');
  }
  root.ManusPpt={defaults,safeUrl,headers,endpoint,check,payload,create,inspect,files,isComplete:t=>t.status==='stopped'&&t.has_running_background_jobs===false};
})(globalThis);
