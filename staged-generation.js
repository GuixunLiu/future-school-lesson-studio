/* Small, teacher-gated requests with durable per-batch checkpoints. */
const lessonLabels=['教师教案','学生讲义','随堂练习','课后作业','家长反馈','PPT大纲'];
const lessonSectionTitles={
 '教师教案':['学情与前置知识','教学目标与重难点','课前准备与环境检查','导入与教师话术','概念讲解与演示','代码演示与跟踪','上机指导与差异化支持','评价、总结与反思'],
 '学生讲义':['学习目标与准备','核心概念与语法','执行流程与跟踪表','完整示例程序','易错点与纠错','课堂任务与操作步骤','笔记与自评','知识总结与复习'],
 '随堂练习':['概念判断题','代码阅读题','变量跟踪题','补全代码题','代码纠错题','编程题：基础任务','编程题：综合任务','边界判断题'],
 '课后作业':['A必做：代码阅读题','A必做：编程题','B选做：代码纠错题','B选做：编程题','C挑战：编程题','C挑战：迁移编程题'],
 '家长反馈':['今日学习内容与能力目标','课堂表现反馈（可选层级，不虚构个体表现）','家庭练习安排与支持建议','可直接发送的反馈文本与下节课预告']
};
const lessonPlanSchema={type:'object',properties:{goal:{type:'string'},points:{type:'array',items:{type:'string'}},excluded:{type:'array',items:{type:'string'}},task:{type:'string'},timeline:{type:'array',items:{type:'object',properties:{phase:{type:'string'},minutes:{type:'integer'},content:{type:'string'},activity:{type:'string'},goal:{type:'string'}},required:['phase','minutes','content','activity','goal'],additionalProperties:false}}},required:['goal','points','excluded','task','timeline'],additionalProperties:false};
const lessonSectionsSchema={type:'object',properties:{sections:{type:'array',items:materialSectionSchema}},required:['sections'],additionalProperties:false};
const lessonSlidesSchema={type:'object',properties:{slides:{type:'array',items:slideSchema}},required:['slides'],additionalProperties:false};
let lessonBusy=false;
function lessonSettings(){return JSON.parse(sessionStorage.getItem('jingbei-apis')||'null')?.ai1}
function lessonError(error){let message=String(error?.message||error);const key=lessonSettings()?.key;if(key)message=message.split(key).join('[已隐藏]');return message}
async function lessonRequest(prompt,schema,budget=6000){
 const s=lessonSettings();if(!s?.key)throw new Error('请先配置AI 1；分步生成需要文字模型API');
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+s.key};
 let url,body;
 if(s.provider==='openai'){url=s.base.replace(/\/+$/,'')+'/responses';body={model:s.model,store:false,max_output_tokens:budget,input:prompt,text:{format:{type:'json_schema',name:'lesson_step',strict:true,schema}}}}
 else{url=s.base.replace(/\/+$/,'')+'/chat/completions';body={model:s.model,messages:[{role:'system',content:'你是严谨的CSP-J教学设计师。只输出合法JSON，所有代码与换行正确转义，不输出Markdown代码围栏。'},{role:'user',content:prompt}],response_format:{type:'json_object'},max_tokens:budget,temperature:.3};if(s.provider==='deepseek')body.thinking={type:'disabled'}}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),180000);
 try{
  const local=typeof apiForward==='function';
  let response;try{response=await fetch(local?'/api/forward':url,{method:'POST',headers:local?{'Content-Type':'application/json'}:headers,body:JSON.stringify(local?{url,method:'POST',headers,body}:body),signal:controller.signal})}
  catch(e){throw new Error(e.name==='AbortError'?'本批等待超过3分钟，已完成的批次已保存，可继续生成。':'无法连接文字模型，请检查网络和API地址；网页版可能受跨域限制，可使用本地版。')}
  const text=await response.text();let data;try{data=JSON.parse(text)}catch{throw new Error('接口返回的不是JSON，请检查API地址，不要填写网页地址。')}
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:data.error?.message||data.message||'接口请求失败（'+response.status+'）');
  if(data.error)throw new Error(data.error.message||'模型报告请求错误');
  if(data.choices?.[0]?.finish_reason==='length'||data.status==='incomplete')throw new Error('本批内容被模型截断，未覆盖已保存内容；请重试当前批次。');
  if(data.choices?.[0]?.finish_reason==='content_filter')throw new Error('本批内容被服务商过滤，请调整要求后重试。');
  const output=data.output_text||data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('')||data.choices?.[0]?.message?.content;
  if(!output?.trim())throw new Error('模型没有返回正文，请检查模型名称与JSON输出支持。');
  try{return parseJsonText(output.trim())}catch{throw new Error('本批返回的JSON不完整或转义错误，已完成内容已保留，请重试当前批次。')}
 }finally{clearTimeout(timer)}
}
function lessonContext(target){return JSON.stringify({topic:target.topic,duration:target.duration,audience:target.audience,type:target.type,level:target.level,prerequisites:target.prerequisites,requirements:target.requirements,goal:target.goal,points:target.points,excluded:target.excluded,task:target.task,timeline:target.timeline})}
generateWithAI1=async function(){
 if(!lessonSettings()?.key)return null;
 const req=courseRequest();
 const plan=await lessonRequest('只生成课程内容建议，不生成教案、讲义、题目、家长反馈或PPT大纲。信息：'+JSON.stringify(req)+'。输出JSON：goal为可检测目标；points为4到7个本课知识点；excluded为本课排除内容列表；task为具体课堂任务建议；timeline恰好6环节，每项phase、minutes、content、activity、goal，分钟数总和等于课程时长。建议必须贴合主题、年龄、CSP-J范围与已掌握知识。',lessonPlanSchema,2500);
 if(!plan.goal||!Array.isArray(plan.points)||plan.points.length<2||!Array.isArray(plan.excluded)||typeof plan.task!=='string'||!Array.isArray(plan.timeline)||plan.timeline.length!==6||plan.timeline.some(x=>!x.phase||!Number.isInteger(x.minutes)||x.minutes<=0||!x.content||!x.activity||!x.goal))throw new Error('课程建议结构不完整，请重新生成建议');
 const sum=plan.timeline.reduce((n,x)=>n+x.minutes,0);
 if(sum!==req.duration){plan.timeline.forEach(x=>x.minutes=Math.max(1,Math.round(x.minutes*req.duration/sum)));plan.timeline[3].minutes+=req.duration-plan.timeline.reduce((n,x)=>n+x.minutes,0);if(plan.timeline[3].minutes<=0)throw new Error('建议课时安排不合理，请重新生成');}
 return {...req,...plan,times:plan.timeline.map(x=>x.minutes),pptSlides:[],teachingMaterials:{},source:'AI 1 · 分步生成',updatedAt:new Date().toLocaleString('zh-CN'),generation:{version:2,suggestionConfirmed:false,blueprintConfirmed:false,states:Object.fromEntries(lessonLabels.map(n=>[n,{status:'empty',parts:[]}]))}};
};
function lessonState(name){return course?.generation?.states?.[name]}
function lessonCheckpoint(label){if(!course)return;course.confirmations=materials.map(m=>m.meta==='已确认');try{saveVersion(label)}catch{show('当前设备存储空间不足，请勿关闭页面，并尽快导出材料')}}
function lessonValidateQuestions(sections,name){validateQuestionMaterials(name==='随堂练习'?{classPractice:sections,homework:Array(6).fill(sections[0])}:{classPractice:Array(8).fill(sections[0]),homework:sections})}
function lessonValidateBatch(sections,titles,name){
 if(!Array.isArray(sections)||sections.length!==titles.length||sections.some(x=>typeof x.title!=='string'||!x.title.trim()||typeof x.content!=='string'||x.content.trim().length<40))throw new Error('本批内容数量或详细程度不足，请重试当前批次');
 if(name==='随堂练习'||name==='课后作业')for(const section of sections){validateQuestionMaterials({classPractice:Array(8).fill(section),homework:Array(6).fill(section)})}
}
function lessonMarkDirty(index){
 const g=course?.generation;if(!g)return;
 lessonLabels.slice(index).forEach(name=>{const state=g.states[name];if(state?.status==='approved')state.status='ready'});
 if(index<=5&&course.manusTask){course.manusPreviousTasks=[...(course.manusPreviousTasks||[]),course.manusTask];delete course.manusTask;}
}
const lessonRenderCourse=renderCourse;
renderCourse=function(){lessonRenderCourse();if(course?.timeline?.length){$('#blueprintBody').innerHTML=course.timeline.map(x=>'<tr contenteditable="true"><td>'+esc(x.phase)+'</td><td>'+x.minutes+'分钟</td><td>'+esc(x.content)+'</td><td>'+esc(x.activity)+'</td><td>'+esc(x.goal)+'</td></tr>').join('')};if(course?.generation){materials.forEach((m,i)=>m.meta=lessonState(m.name)?.status==='approved'?'已确认':'待生成');renderMats()}else if(course?.confirmations){materials.forEach((m,i)=>m.meta=course.confirmations[i]?'已确认':'待确认');renderMats()}};
const lessonRenderMats=renderMats;
renderMats=function(){
 if(!course?.generation){lessonRenderMats();return}
 materials.forEach(m=>{const s=lessonState(m.name);m.meta={empty:'待生成',generating:'生成中',failed:'生成中断',ready:'待确认',approved:'已确认'}[s?.status]||'待生成'});
 lessonRenderMats();
 const state=lessonState(materials[activeMat].name);
 $('#approveBtn').disabled=lessonBusy||!['ready','approved'].includes(state?.status);
 const content=$('#materialContent');if(!['ready','approved'].includes(state?.status)){
  const titles=lessonSectionTitles[materials[activeMat].name],total=titles?Math.ceil(titles.length/2):Math.ceil((course.duration<=60?12:course.duration<=90?18:24)/3);
  content.innerHTML='<section class="editor-card"><h3>'+esc(state?.status==='failed'?'本项生成已中断':state?.status==='generating'?'正在生成本项':'本项尚未生成')+'</h3><p>已保存 '+(state?.parts?.length||0)+' / '+total+' 批。每批完成后自动保存，确认前不会生成下一项。</p>'+(state?.error?'<p role="alert">'+esc(state.error)+'</p>':'')+'</section>';
 }
 const actions=$$('.preview-head .ghost');if(actions[1]){actions[1].textContent=state?.status==='failed'||state?.parts?.length&&!['ready','approved'].includes(state.status)?'继续生成本项':['ready','approved'].includes(state?.status)?'重新生成本项':'生成本项';actions[1].disabled=lessonBusy;actions[1].onclick=()=>generateLessonMaterial()}
 if(actions[0]){actions[0].textContent='直接编辑内容';actions[0].disabled=!['ready','approved'].includes(state?.status)||lessonBusy;actions[0].onclick=()=>{content.querySelector('[contenteditable]')?.focus();show('可直接编辑文字，修改后请重新确认本项')}}
 const tabs=$$('#materialTabs button');tabs.forEach((b,i)=>b.onclick=()=>{if(lessonBusy){show('当前批次正在生成，请稍候');return}if(i>0&&!lessonLabels.slice(0,i).every(n=>lessonState(n)?.status==='approved')){show('请先依次确认前面的材料');return}captureActiveMaterial(materials[activeMat].name);activeMat=i;$('#approveCheck').checked=false;renderMats()});
};
async function generateLessonMaterial(){
 if(lessonBusy){show('当前批次正在生成，请稍候');return}
 if(!course?.generation){show('已有课程使用旧流程；请新建课程使用分步生成');return}
 const target=course,name=materials[activeMat].name,index=activeMat,state=lessonState(name);
 if(!target.generation.suggestionConfirmed||!target.generation.blueprintConfirmed){show('请先确认课程建议和教学蓝图');return}
 if(!lessonLabels.slice(0,index).every(n=>lessonState(n)?.status==='approved')){show('请先确认前面的材料');return}
 if(['ready','approved'].includes(state.status)){if(!confirm('重新生成本项会替换本项内容，并要求后续材料重新确认。是否继续？'))return;state.parts=[];lessonMarkDirty(index)}
 lessonBusy=true;state.status='generating';state.error='';renderMats();lessonCheckpoint(name+'正在生成');
 try{
  if(name==='PPT大纲'){
   const count=target.duration<=60?12:target.duration<=90?18:24,total=Math.ceil(count/3);
   for(let batch=state.parts.length;batch<total;batch++){
    const first=batch*3+1,last=Math.min(count,first+2);
    const prompt='仅生成教师已确认课程的PPT详细大纲第'+first+'至'+last+'页，共'+count+'页。本次只输出这'+(last-first+1)+'页的JSON对象{slides:[...]}，不得重复其它页。每页包括page,type,objective,title,body（页面完整文字列表）,code（完整代码或空字符串）,visual（具体图表元素和数据）,layout（元素位置和大小关系）,interaction,speaker_notes,minutes（整数）。所有页形成导入、目标、概念、过程模拟、代码拆解、完整代码、跟踪、易错、上机、测试、总结的连续课堂。页面不得只是标题，要可以直接制作。课程边界：'+lessonContext(target)+'。已确认的五份材料：'+JSON.stringify(target.teachingMaterials)+'。已经生成的页面：'+JSON.stringify(state.parts.flat())+'。不能增删知识点，不改变已确认题目和答案。';
    const result=await lessonRequest(prompt,lessonSlidesSchema);
    const slides=result.slides;
    if(!Array.isArray(slides)||slides.length!==last-first+1||slides.some((x,i)=>x.page!==first+i||!x.title||!x.objective||!Array.isArray(x.body)||!x.body.length||!x.visual||!x.layout||!x.speaker_notes||typeof x.code!=='string'||!x.interaction||!Number.isInteger(x.minutes)))throw new Error('本批PPT逐页大纲不完整，请重试当前批次');
    if(course!==target)return;state.parts.push(slides);target.pptSlides=state.parts.flat();lessonCheckpoint(name+'第'+(batch+1)+'批已保存');renderMats();
   }
  }else{
   const titles=lessonSectionTitles[name],total=Math.ceil(titles.length/2);
   for(let batch=state.parts.length;batch<total;batch++){
    const requested=titles.slice(batch*2,batch*2+2);
    const prompt='只生成本课的'+name+'，本批仅写这'+requested.length+'节（或题）：'+JSON.stringify(requested)+'。输出JSON对象{sections:[{title,content}]}，数量必须一致，不生成其它材料。每节必须是完整可直接使用的正文，不是目录，普通材料每节约250至500中文字符，代码不省略。教师教案包含具体教师话术、时长、活动、评价；学生讲义包含实际语法、完整可编译示例、跟踪数据和易错分析；家长反馈可直接发送，但不得虚构学生个体表现。课程已确认边界：'+lessonContext(target)+'。前面已确认材料（只作一致性参考）：'+JSON.stringify(target.teachingMaterials)+'。本项此前已完成内容（不要重复）：'+JSON.stringify(state.parts.flat())+(name==='随堂练习'||name==='课后作业'?questionRequirements(target)+'本次仅输出指定的'+requested.length+'题，不要一次写全部题。题型明确写在title里，编程题必须题干具体、具有可编译参考程序；非编程题无需强加输入输出格式。':'');
    const result=await lessonRequest(prompt,lessonSectionsSchema);
    lessonValidateBatch(result.sections,requested,name);
    if(course!==target)return;state.parts.push(result.sections);target.teachingMaterials[name]=state.parts.flat();lessonCheckpoint(name+'第'+(batch+1)+'批已保存');renderMats();
   }
   if(name==='随堂练习'||name==='课后作业')lessonValidateQuestions(target.teachingMaterials[name],name);
  }
  state.status='ready';lessonCheckpoint(name+'草稿已完成');show(name+'已完成，请修改并确认后再生成下一项');
 }catch(error){state.status='failed';state.error=lessonError(error);if(course===target)lessonCheckpoint(name+'中断，进度已保存');show(state.error)}
 finally{lessonBusy=false;if(course===target)renderMats()}
}
const lessonApprove=$('#approveBtn').onclick;
$('#approveBtn').onclick=()=>{
 if(!course?.generation)return lessonApprove();
 if(lessonBusy||!['ready','approved'].includes(lessonState(materials[activeMat].name)?.status)){show('请先完整生成本项');return}
 const name=materials[activeMat].name;
 captureActiveMaterial(name);
 if(name==='随堂练习'||name==='课后作业'){try{lessonValidateQuestions(course.teachingMaterials[name],name)}catch(e){show(lessonError(e));return}}
 lessonState(name).status='approved';materials[activeMat].meta='已确认';lessonCheckpoint(name+'已确认');
 if(activeMat<4||activeMat===4&&hasPptAI())activeMat++;
 $('#approveCheck').checked=false;renderMats();show(name==='家长反馈'&&!hasPptAI()?'五项已确认，可以直接完成备课':'本项已确认，请点击生成下一项');
};
$$('.next').forEach(button=>button.addEventListener('click',e=>{
 if(lessonBusy){e.stopImmediatePropagation();show('当前批次正在生成，请稍候');return}
 if(current===0){lessonBusy=true;button.disabled=true;const original=generateWithAI1;generateWithAI1=async function(){try{return await original()}finally{lessonBusy=false;button.disabled=false;generateWithAI1=original}};return}
 if(!course?.generation)return;
 if(current===1){
  const previous=JSON.stringify({goal:course.goal,points:course.points,excluded:course.excluded,task:course.task});
  course.goal=$('#goalText').innerText.trim();course.points=$$('#contentPoints li').map(x=>x.innerText.trim()).filter(Boolean);course.excluded=$$('#excludedPoints li').map(x=>x.innerText.trim()).filter(Boolean);course.task=$('#taskText').innerText.trim();
  if(!course.goal||!course.points.length||!course.task){e.stopImmediatePropagation();show('请填写教学目标、知识点和课堂任务');return}
  if(previous!==JSON.stringify({goal:course.goal,points:course.points,excluded:course.excluded,task:course.task})){lessonMarkDirty(0);Object.values(course.generation.states).forEach(s=>{s.parts=[];s.status='empty'});course.teachingMaterials={};course.pptSlides=[]}
  course.generation.suggestionConfirmed=true;course.generation.blueprintConfirmed=false;lessonCheckpoint('内容建议已确认');
 }
 if(current===2){
  if(!course.generation.suggestionConfirmed){e.stopImmediatePropagation();show('请先确认内容建议');return}
  const rows=$$('#blueprintBody tr').map(tr=>{const cells=[...tr.querySelectorAll('td')].map(x=>x.innerText.trim());return {phase:cells[0],minutes:Number(cells[1]?.replace(/分钟/g,'')),content:cells[2],activity:cells[3],goal:cells[4]}});
  if(rows.length!==6||rows.some(x=>!Number.isInteger(x.minutes)||x.minutes<=0)||rows.reduce((n,x)=>n+x.minutes,0)!==course.duration){e.stopImmediatePropagation();show('六个环节的分钟数必须为正整数，总计'+course.duration+'分钟');return}
  if(JSON.stringify(rows)!==JSON.stringify(course.timeline)){lessonMarkDirty(0);Object.values(course.generation.states).forEach(s=>{s.parts=[];s.status='empty'});course.teachingMaterials={};course.pptSlides=[]}
  course.timeline=rows;course.times=rows.map(x=>x.minutes);course.generation.blueprintConfirmed=true;lessonCheckpoint('蓝图已确认');
 }
},true));
const lessonGo=go;
go=function(n){if(lessonBusy){show('当前批次正在生成，请稍候');return}if(course?.generation&&n>=3&&!course.generation.blueprintConfirmed){show('请先确认课程建议和教学蓝图');return}if(course?.generation&&n>=4){const required=hasPptAI()?lessonLabels:lessonLabels.slice(0,5);if(!required.every(name=>lessonState(name)?.status==='approved')){show('请先依次生成并确认材料');return}}lessonGo(n)};
$('#goalText').setAttribute('contenteditable','true');
$('#materialContent').addEventListener('input',()=>{if(!course?.generation)return;lessonMarkDirty(activeMat);lessonState(materials[activeMat].name).status='ready';materials[activeMat].meta='待确认';$('#approveCheck').checked=false;captureActiveMaterial(materials[activeMat].name);lessonCheckpoint('教师修改已保存')});
$('#resetBtn').addEventListener('click',()=>{if(lessonBusy)show('请等待当前批次完成')});
$('#recentCourses').addEventListener('click',e=>{if(lessonBusy){e.stopImmediatePropagation();show('请等待当前批次完成')}},true);
const lessonNew=$('#newCourse').onclick;$('#newCourse').onclick=()=>{if(lessonBusy){show('请等待当前批次完成');return}lessonNew()};
const firstButton=$('[data-stage="0"] .next');
firstButton.insertAdjacentHTML('beforebegin','<p id="lessonFailure" role="alert" hidden></p>');
const lessonShow=show;show=function(msg){lessonShow(msg);if(current===0&&/生成未完成/.test(msg)){$('#lessonFailure').hidden=false;$('#lessonFailure').textContent=lessonError(msg)}};
firstButton.addEventListener('click',()=>{$('#lessonFailure').hidden=true},true);
if(course?.generation)renderMats();
if(!course&&Number(localStorage.getItem('jingbei-step')||0)>0){
 try{const latest=JSON.parse(localStorage.getItem('jingbei-courses')||'[]')[0];if(latest?.generation?.version===2){course=latest;$('#topic').value=course.topic;$('#courseName').textContent=course.topic;Object.values(course.generation.states).forEach(s=>{if(s.status==='generating'){s.status='failed';s.error='上次生成中断，已完成批次已保留，请继续生成本项'}});renderCourse();const all=(hasPptAI()?lessonLabels:lessonLabels.slice(0,5)).every(n=>lessonState(n)?.status==='approved');lessonGo(course.generation.blueprintConfirmed?(all?Math.min(Number(localStorage.getItem('jingbei-step')||3),5):3):1)}}catch{show('保存的课程暂时无法恢复，请从最近备课选择课程')}
}

