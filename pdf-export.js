/* Markdown -> searchable PDF. Local assets, no third-party upload. */
let lessonPdfFontPromise;
const markdownFence=String.fromCharCode(96).repeat(3);
function cleanFileName(value){return String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').trim().slice(0,100)||'课程';}
function materialContentMarkdown(content){
  const lines=String(content||'').replace(/\r\n/g,'\n').split('\n'),out=[];
  let inFence=false,autoCode=false,sample=false;
  const closeAuto=()=>{if(autoCode||sample){out.push(markdownFence,'');autoCode=false;sample=false;}};
  const codeLine=s=>/^\s*(#include\b|using\s+namespace\b|(?:int|long long|double|float|char|bool|auto|void|string)\s+\w|(?:for|while|if|else|switch|return|cout|cin|break|continue)\b|[{}](?:;)?\s*$|\/\/)/.test(s)||/^\s*\w+(?:\+\+|--|\s*[+*\-/]?=).*;\s*$/.test(s);
  for(const line of lines){
    if(/^\s*\x60{3}/.test(line)){closeAuto();inFence=!inFence;out.push(line);continue;}
    if(inFence){out.push(line);continue;}
    const marker=line.match(/^【([^】]+)】\s*$/);
    if(marker){closeAuto();out.push('','### '+marker[1],'');if(/^样例(输入|输出)$/.test(marker[1])){out.push(markdownFence+'text');sample=true;}continue;}
    if(sample){out.push(line);continue;}
    if(codeLine(line)){if(!autoCode){out.push('',markdownFence+'cpp');autoCode=true;}out.push(line);continue;}
    if(autoCode&&line.trim()===''){out.push(line);continue;}
    closeAuto();out.push(line);
  }
  closeAuto();
  if(inFence)out.push(markdownFence);
  return out.join('\n').trim();
}
function splitQuestionSections(sections,variant){
  if(!['questions','answers'].includes(variant))throw new Error('请选择题目或答案版本');
  return sections.map(section=>{
    const lines=String(section.content||'').replace(/\r\n/g,'\n').split('\n');
    let fenced=false,cut=-1;
    for(let i=0;i<lines.length;i++){
      if(/^\s*\x60{3}/.test(lines[i])){fenced=!fenced;continue;}
      if(!fenced&&(/^\s*(?:#{1,6}\s*)?(?:\*\*)?【(?:参考答案|答案|解析|评分标准|参考程序|解题思路)】/.test(lines[i])||/^\s*#{1,6}\s+(?:参考答案|答案|解析|评分标准|参考程序|解题思路)\s*[:：]?\s*$/.test(lines[i]))){cut=i;break;}
    }
    if(cut<=0||!lines.slice(cut+1).join('\n').trim())throw new Error(section.title+'无法区分题目和答案，请保留【参考答案】等分隔标题后再导出');
    return {title:section.title,content:(variant==='questions'?lines.slice(0,cut):lines.slice(cut)).join('\n').trim()};
  });
}
function lessonMarkdown(name,topic,meta,sections){
  return '# '+topic+' · '+name+'\n\n'+meta+'\n\n'+sections.map(s=>'## '+s.title+'\n\n'+materialContentMarkdown(s.content)).join('\n\n---\n\n')+'\n';
}
function markdownPdfBlocks(markdown){
  const lines=String(markdown).replace(/\r\n/g,'\n').split('\n'),blocks=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/^\s*\x60{3}/.test(line)){const content=[];while(++i<lines.length&&!/^\s*\x60{3}/.test(lines[i]))content.push(lines[i]);blocks.push({type:'code',lines:content});continue;}
    if(!line.trim())continue;
    const heading=line.match(/^(#{1,6})\s+(.*)$/);
    if(heading){blocks.push({type:'heading',level:heading[1].length,text:heading[2]});continue;}
    if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)){blocks.push({type:'rule'});continue;}
    if(line.includes('|')&&i+1<lines.length&&/^\s*\|?[\s:\-|]+\|?\s*$/.test(lines[i+1])&&lines[i+1].includes('-')){
      const cells=s=>s.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
      const rows=[cells(line)];i++;while(i+1<lines.length&&lines[i+1].includes('|')&&lines[i+1].trim())rows.push(cells(lines[++i]));
      blocks.push({type:'table',rows});continue;
    }
    blocks.push({type:'text',text:line.replace(/^\s*>\s?/,'').replace(/^\s*[-*+]\s+/,'• ')});
  }
  return blocks;
}
function plainMarkdownText(text){return String(text).replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1 ($2)').replace(/(\*\*|__)(.*?)\1/g,'$2').replace(/\x60([^\x60]+)\x60/g,'$1').replace(/\*([^*]+)\*/g,'$1');}
async function getLessonPdfFont(){
  if(!lessonPdfFontPromise)lessonPdfFontPromise=fetch('./vendor/NotoSansSC-Regular.ttf').then(r=>{if(!r.ok)throw new Error('中文PDF字体加载失败，请刷新后重试');return r.arrayBuffer();}).catch(e=>{lessonPdfFontPromise=null;throw e;});
  return lessonPdfFontPromise;
}
async function markdownToPdf(markdown,title){
  if(typeof PDFLib==='undefined'||typeof fontkit==='undefined')throw new Error('PDF组件未加载，请刷新后重试');
  const {PDFDocument,rgb}=PDFLib,doc=await PDFDocument.create();
  doc.registerFontkit(fontkit);doc.setTitle(title);doc.setCreator('未来学校教师备课台');
  const font=await doc.embedFont(await getLessonPdfFont(),{subset:false}),W=595.28,H=841.89,margin=45,bottom=52,width=W-2*margin,ink=rgb(.09,.14,.22),muted=rgb(.35,.40,.46),pages=[];
  let page,y;
  const newPage=()=>{page=doc.addPage([W,H]);pages.push(page);y=H-52;};
  const ensure=h=>{if(!page||y-h<bottom)newPage();};
  const glyphWidths=new Map();
  const measure=(s,size)=>Array.from(s).reduce((n,c)=>{if(!glyphWidths.has(c))glyphWidths.set(c,font.widthOfTextAtSize(c,1));return n+glyphWidths.get(c)*size;},0);
  const wrap=(s,size,max)=>{const rows=[];let row='',count=0;for(const c of Array.from(s.replace(/\t/g,'    '))){const w=measure(c,size);if(count+w>max&&row){rows.push(row);row='';count=0;}row+=c;count+=w;}rows.push(row);return rows;};
  const drawLines=(text,size=11.5,opts={})=>{const leading=opts.leading||size*1.7,x=margin+(opts.inset||0),max=width-(opts.inset||0)*2,rows=wrap(text,size,max);for(const row of rows){ensure(leading);if(opts.code)page.drawRectangle({x:margin,y:y-leading+3,width,height:leading+1,color:rgb(.95,.96,.98)});page.drawText(row||' ',{x,y:y-size,size,font,color:opts.color||ink});y-=leading;}};
  newPage();
  const blocks=markdownPdfBlocks(markdown);
  for(let b=0;b<blocks.length;b++){
    const block=blocks[b];
    if(block.type==='heading'){const size=block.level===1?21:block.level===2?15:12.5;const h=wrap(plainMarkdownText(block.text),size,width).length*size*1.55,next=blocks[b+1],follow=next?.type==='code'?next.lines.reduce((n,line)=>n+wrap(line,9.2,width-20).length*14.5,0)+16:35;ensure(h+17+Math.min(follow,H-52-bottom-h-17));y-=block.level===1?0:9;drawLines(plainMarkdownText(block.text),size,{leading:size*1.55});y-=8;}
    else if(block.type==='rule'){ensure(14);y-=5;page.drawLine({start:{x:margin,y},end:{x:W-margin,y},thickness:.5,color:rgb(.85,.88,.9)});y-=10;}
    else if(block.type==='code'){const blockHeight=block.lines.reduce((n,line)=>n+wrap(line,9.2,width-20).length*14.5,0)+16;ensure(blockHeight<H-52-bottom?blockHeight:36);y-=4;for(const line of block.lines)drawLines(line,9.2,{leading:14.5,inset:10,code:true});y-=12;}
    else if(block.type==='table'){
      const cols=Math.max(...block.rows.map(r=>r.length)),cellWidth=width/cols;
      for(let rowIndex=0;rowIndex<block.rows.length;rowIndex++){
        const cells=block.rows[rowIndex],wrapped=Array.from({length:cols},(_,i)=>wrap(plainMarkdownText(cells[i]||''),10,cellWidth-12)),lineCount=Math.max(...wrapped.map(r=>r.length));
        for(let start=0;start<lineCount;){
          ensure(30);const count=Math.max(1,Math.min(lineCount-start,Math.floor((y-bottom-12)/16))),height=count*16+12;
          for(let c=0;c<cols;c++){page.drawRectangle({x:margin+c*cellWidth,y:y-height,width:cellWidth,height,borderWidth:.5,borderColor:rgb(.80,.84,.88),color:rowIndex===0?rgb(.92,.95,.97):rgb(1,1,1)});for(let k=0;k<count;k++){const text=wrapped[c][start+k];if(text)page.drawText(text,{x:margin+c*cellWidth+6,y:y-16-k*16,size:10,font,color:ink});}}
          y-=height;start+=count;
        }
      }y-=12;
    }else{drawLines(plainMarkdownText(block.text));y-=5;}
  }
  pages.forEach((p,i)=>{p.drawLine({start:{x:margin,y:35},end:{x:W-margin,y:35},thickness:.4,color:rgb(.84,.87,.9)});p.drawText('未来学校教师备课台',{x:margin,y:22,size:8,font,color:muted});const label=(i+1)+' / '+pages.length;p.drawText(label,{x:W-margin-measure(label,8),y:22,size:8,font,color:muted});});
  return new Uint8Array(await doc.save());
}
