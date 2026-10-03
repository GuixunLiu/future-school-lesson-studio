/* Manus v2 integration: task creation, resumable polling, and output attachments. */
pptProviderNames.manus='Manus（官方 v2）';
const manusPreset=()=>{Object.entries(ManusPpt.defaults).forEach(([k,v])=>setValue('ai2'+k[0].toUpperCase()+k.slice(1),v));manusSettingsHint()};
function manusSettingsHint(){const on=$('#ai2Provider').value==='manus';$('#manusProfileRow').hidden=!on;$('#pptProviderHint').textContent=on?'Manus官方v2：自动提交详细大纲附件，查询任务并提取PPTX。API Key 使用 x-manus-api-key；不需要填写聊天模型。模板、动画和字体嵌入是制作要求，是否支持由Manus工具决定。建议使用本地版避免浏览器跨域限制。':$('#ai2Provider').value==='kimi'?'请按你实际获得的Kimi PPT接口文档填写端点。':'请根据服务商文档填写接口路径和返回字段。';}
const oldProviderChange=$('#ai2Provider').onchange;
$('#ai2Provider').onchange=e=>{if(e.target.value==='manus')manusPreset();else{oldProviderChange(e);manusSettingsHint()}};
[$('#settingsBtn'),$('#openPptSettings')].forEach(b=>b.addEventListener('click',manusSettingsHint));
manusSettingsHint();
async function manusRequest(spec){
  if(typeof apiForward==='function')return apiForward(spec);
  let response;
  try{response=await fetch(spec.url,{method:spec.method||'POST',headers:spec.headers,body:spec.body===undefined?undefined:JSON.stringify(spec.body),signal:AbortSignal.timeout(90000)})}
  catch{throw new Error('未收到Manus响应。任务可能已创建，请先查看Manus任务列表；网络或跨域限制时请使用本地版。')}
  let data;try{data=await response.json()}catch{throw new Error('Manus未返回JSON，请检查基础地址和接口版本')}
  if(!response.ok)throw new Error(data.error?.message||'Manus请求失败（'+response.status+'）');
  return data;
}
function manusSpec(){return {title:course.topic,outline:course.pptSlides,course:{duration:course.duration,audience:course.audience,type:course.type},options:{style:$('#pptStyle').value,template:$('#pptTemplate').value.trim(),ratio:$('#pptRatio').value,image_mode:$('#pptImages').value,code_theme:$('#pptCodeTheme').value,speaker_notes:$('#pptNotes').checked,animations:$('#pptAnimation').checked,embed_fonts:$('#pptFonts').checked,format:JSON.parse(sessionStorage.getItem('jingbei-apis')||'null')?.ai2?.format||'pptx'}}}
function manusStatus(title,detail,task){const job=$('#pptJob');job.className='ppt-job';job.querySelector('strong').textContent=title;job.querySelector('small').textContent=detail;job.querySelectorAll('a').forEach(a=>a.remove());const url=ManusPpt.safeUrl(task?.task_url);if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='打开Manus任务';a.style.display='block';job.querySelector('div').append(a)}}
async function downloadManusFile(file){const url=ManusPpt.safeUrl(file?.url);if(!url){show('尚未获得PPT文件，请查询任务');return}try{let blob;if(typeof apiForward==='function')blob=await apiForward({url,method:'GET',headers:{}});else{const r=await fetch(url);if(!r.ok)throw new Error('文件链接失效');blob=await r.blob()}if(!(blob instanceof Blob))throw new Error('下载响应不是文件');saveBlob(blob,cleanFileName(course?.topic||'课程')+'-课堂PPT.'+file.format)}catch{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.click();show('已打开附件地址；若链接过期，请重新查询任务')}}
async function manusFileBytes(file){const url=ManusPpt.safeUrl(file?.url);if(!url)throw new Error('PPT附件地址无效');let blob;if(typeof apiForward==='function')blob=await apiForward({url,method:'GET',headers:{}});else{const response=await fetch(url);if(!response.ok)throw new Error('PPT链接过期，请继续查询Manus任务后再下载课程包');blob=await response.blob()}if(!(blob instanceof Blob))throw new Error('未能获取PPT文件');return new Uint8Array(await blob.arrayBuffer())}
function renderManusFiles(target){const box=$('#manusFiles');box.replaceChildren();for(const f of target?.manusTask?.files||[]){const b=document.createElement('button');b.className='secondary';b.textContent='下载 '+f.format.toUpperCase();b.onclick=()=>downloadManusFile(f);box.append(b)}$('#resumeManus').hidden=!target?.manusTask?.id;$('#makePpt').textContent=target?.manusTask?.id?'查询现有Manus任务':'提交PPT生成任务'}
let manusBusy=false;
async function runManus(resume=false){
  if(manusBusy){show('正在查询，请稍候');return}
  const settings=JSON.parse(sessionStorage.getItem('jingbei-apis')||'null')?.ai2;
  if(settings?.provider!=='manus'||!settings.key||!settings.base){openSettings();show('请选择Manus并填写API Key');return}
  const target=course;
  if(!target){show('请先完成课程内容确认');return}
  if(!target.manusTask?.id&&!materials.every(m=>m.meta==='已确认')){show('请先确认五项文字材料及逐页PPT大纲');return}
  if(target.manusTask?.base&&target.manusTask.base!==settings.base){show('请使用创建任务时的API基础地址');return}
  manusBusy=true;$('#makePpt').disabled=true;$('#resumeManus').disabled=true;
  try{
    if(!target.manusTask?.id){
      if(resume){show('没有可继续查询的任务');return}
      manusStatus('正在提交Manus任务','仅发送已确认的详细大纲，生成可能消耗Manus额度。');
      const result=await ManusPpt.create(manusRequest,settings,manusSpec());
      if(!result.task_id)throw new Error('Manus未返回任务编号，请先检查Manus任务列表，不要重复提交');
      target.manusTask={id:result.task_id,base:settings.base,task_url:result.task_url,files:[],state:'running'};
      if(course===target)saveVersion('Manus任务已提交');
    }
    const task=target.manusTask;
    for(let i=0;i<120;i++){
      if(course!==target)return;
      const info=await ManusPpt.inspect(manusRequest,settings,task.id);
      task.state=info.status;if(info.task_url)task.task_url=info.task_url;
      manusStatus('Manus正在制作PPT','任务编号 '+task.id+' · 状态 '+info.status,task);
      if(info.status==='error')throw new Error('Manus任务出错，请打开任务页查看原因。可以继续查询，不会重复创建。');
      if(info.status==='waiting'){manusStatus('Manus需要你的确认','请打开任务页处理提问或操作确认，然后继续查询。',task);break}
      if(ManusPpt.isComplete(info)){
        task.files=await ManusPpt.files(manusRequest,settings,task.id);
        if(task.files.length){manusStatus('Manus生成完成','请下载附件并检查内容、代码和排版。',task);saveVersion('Manus PPT已生成');break}
        manusStatus('任务已结束，但未找到PPT附件','请打开任务页查看结果；系统不会用演示文件替代。',task);break;
      }
      if(i===119){manusStatus('任务仍在处理中','已等待10分钟，任务编号已保存。稍后点击继续查询，不会重复提交。',task);break}
      await new Promise(r=>setTimeout(r,5000));
    }
  }catch(error){let message=String(error.message||'请求失败');if(settings.key)message=message.split(settings.key).join('[已隐藏]');manusStatus('Manus请求未完成',message,target.manusTask);show(message)}
  finally{manusBusy=false;$('#makePpt').disabled=false;$('#resumeManus').disabled=false;if(course===target){renderManusFiles(target);if(target.manusTask)saveVersion('Manus任务状态已保存')}}
}
const genericMakePpt=$('#makePpt').onclick;
$('#makePpt').onclick=e=>JSON.parse(sessionStorage.getItem('jingbei-apis')||'null')?.ai2?.provider==='manus'?runManus():genericMakePpt(e);
$('#resumeManus').onclick=()=>runManus(true);
const originalCapture=captureActiveMaterial;
captureActiveMaterial=function(name){if(name!=='PPT大纲')return originalCapture(name);if(!course)return;const cards=$$('.slide-spec');if(cards.length)course.pptSlides=cards.map((card,i)=>{const old=course.pptSlides[i]||{},parts=card.querySelectorAll('.spec-grid section'),read=label=>[...parts].find(s=>s.querySelector('b')?.textContent===label);return {...old,title:card.querySelector('h3')?.innerText||old.title,objective:(card.querySelector('.objective')?.innerText||'').replace(/^本页目的：/,''),body:[...(read('页面文字')?.querySelectorAll('li')||[])].map(x=>x.innerText),visual:read('视觉元素')?.querySelector('p')?.innerText||'',layout:read('版式说明')?.querySelector('p')?.innerText||'',interaction:read('课堂互动')?.querySelector('p')?.innerText||'',code:read('代码 / 数据')?.querySelector('pre')?.innerText||'',speaker_notes:read('教师讲解备注')?.querySelector('p')?.innerText||''}})};
const originalGo=go;go=function(n){originalGo(n);renderManusFiles(course)};
const pptExport=$('.package-list > div:first-child button');
const previousPptDownload=pptExport.onclick;
pptExport.onclick=()=>{const file=course?.manusTask?.files?.find(f=>f.format==='pptx')||course?.manusTask?.files?.[0];file?downloadManusFile(file):previousPptDownload()};
renderManusFiles(course);

