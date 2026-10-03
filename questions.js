/* Concrete exercises used only when no text AI is configured. */
function exercise(title,statement,answer,analysis){
  return {title,content:'【题目】\n'+statement+'\n\n【参考答案】\n'+answer+'\n\n【解析】\n'+analysis+'\n\n【评分标准】\n答案或程序正确4分，步骤与解释正确4分，边界或格式正确2分。'};
}
function programmingExercise(title,description,range,input,output,sampleIn,sampleOut,solution,analysis){
  return exercise(title,description+'\n\n【数据范围】\n'+range+'\n【输入格式】\n'+input+'\n【输出格式】\n'+output+'\n【样例输入】\n'+sampleIn+'\n【样例输出】\n'+sampleOut, '#include <iostream>\nusing namespace std;\nint main() {\n'+solution+'\n    return 0;\n}',analysis);
}
function concreteQuestionMaterials(topic){
  if(/for|循环/i.test(topic)){
    return {
      '随堂练习':[
        exercise('第1题｜循环执行次数','阅读代码，写出完整输出和循环执行次数：\nfor (int i = 1; i <= 4; i++) cout << i << " ";','输出：1 2 3 4；循环体执行4次。','i从1开始；每轮先判断i<=4，输出后增加1。当i变成5时条件不成立。'),
        exercise('第2题｜累加变量跟踪','阅读代码，填写每轮结束时i和s的值，并写出最后输出：\nint s = 0;\nfor (int i = 1; i <= 4; i++) s += i;\ncout << s;','各轮结束时(i,s)：(1,1)、(2,3)、(3,6)、(4,10)。最终输出10。','s依次累加1、2、3、4；记录的是循环体完成且i++尚未执行时的i。'),
        exercise('第3题｜步长为2','阅读代码，写出输出和执行次数：\nfor (int i = 2; i <= 9; i += 2) cout << i << " ";','输出2 4 6 8，执行4次。','i依次取2、4、6、8；更新后为10，不满足i<=9。'),
        exercise('第4题｜倒序输出','补全两处空格，使输出恰好为5 4 3 2 1：\nfor (int i = 5; ______; ______) cout << i << " ";','条件填i >= 1，更新填i--。','从5开始每轮减1，包含1；若填i>1会漏掉1，若填i++无法按要求终止。'),
        exercise('第5题｜边界错误修复','原程序希望求1到5的和：\nint s = 0;\nfor (int i = 1; i < 5; i++) s += i;\ncout << s;\n写出原输出、正确输出并修改一处条件。','原输出10；正确输出15；将i < 5改为i <= 5。','原循环只累加1、2、3、4；包含上界5时才能得到15。'),
        exercise('第6题｜continue语句','阅读代码并写出输出：\nfor (int i = 1; i <= 5; i++) {\n    if (i == 3) continue;\n    cout << i << " ";\n}','输出1 2 4 5。','i=3时跳过本轮输出，仍执行for的更新表达式i++，所以后续4和5正常输出。'),
        programmingExercise('第7题｜上机：1到n的和','输入整数n，使用for循环计算1+2+...+n。','1 <= n <= 10000','一行一个整数n。','一行一个整数，表示总和。','5','15','    int n; cin >> n;\n    long long s = 0;\n    for (int i = 1; i <= n; i++) s += i;\n    cout << s << "\\n";','s从0开始累加。n=1输出1；n=10000输出50005000。'),
        programmingExercise('第8题｜上机：偶数计数','输入n，统计1到n之间（含两端）有多少个偶数，要求使用循环与条件判断。','1 <= n <= 10000','一行一个整数n。','一行一个整数，表示偶数个数。','9','4','    int n; cin >> n;\n    int count = 0;\n    for (int i = 1; i <= n; i++) {\n        if (i % 2 == 0) count++;\n    }\n    cout << count << "\\n";','1到9的偶数是2、4、6、8，共4个。n=1输出0，n=2输出1。')
      ],
      '课后作业':[
        programmingExercise('A1｜必做：倒序报数','输入n，使用for循环依次输出n到1，每个数字单独占一行。','1 <= n <= 100','一行一个整数n。','n行，依次为n、n-1、...、1。','3','3\n2\n1','    int n; cin >> n;\n    for (int i = n; i >= 1; i--) cout << i << "\\n";','循环从n出发，每轮减1，条件包含1。n=1只输出一行1。'),
        programmingExercise('A2｜必做：奇数求和','计算1到n之间全部奇数的和。','1 <= n <= 10000','一行一个整数n。','一行一个整数，表示奇数之和。','7','16','    int n; cin >> n;\n    long long s = 0;\n    for (int i = 1; i <= n; i += 2) s += i;\n    cout << s << "\\n";','从1开始步长为2，依次加入1、3、5、7，总和16。n=2时结果仍为1。'),
        programmingExercise('B1｜选做：统计及格人数','读入n名学生的分数，统计分数不低于60的人数。每读入一个分数立即处理。','1 <= n <= 100；0 <= 分数 <= 100','第一行n；第二行n个整数，空格分隔。','一行一个整数，表示及格人数。','5\n59 60 100 42 80','3','    int n; cin >> n;\n    int count = 0;\n    for (int i = 0; i < n; i++) {\n        int score; cin >> score;\n        if (score >= 60) count++;\n    }\n    cout << count << "\\n";','60恰好及格，必须使用>=。样例中60、100、80及格；不需要保存全部分数。'),
        programmingExercise('B2｜选做：阶乘','输入n，计算n! = 1×2×...×n。约定0! = 1。','0 <= n <= 12','一行一个整数n。','一行一个整数，表示n!。','5','120','    int n; cin >> n;\n    long long product = 1;\n    for (int i = 1; i <= n; i++) product *= i;\n    cout << product << "\\n";','乘积初值必须是1。n=0时循环不执行，结果保持1。n=12输出479001600。'),
        programmingExercise('C1｜挑战：存钱目标','每天存入当天编号那么多元：第1天1元，第2天2元，依次递增。给定目标金额k，至少几天能存够？','1 <= k <= 1000000','一行一个整数k。','一行一个整数，表示最少天数。','7','4','    int k; cin >> k;\n    int total = 0, day;\n    for (day = 1; ; day++) {\n        total += day;\n        if (total >= k) break;\n    }\n    cout << day << "\\n";','前3天共6元，未达到7；第4天达到10元，答案4。k=1输出1；k=6输出3。'),
        exercise('C2｜挑战：定位死循环','下面代码希望输出1、2、3，但没有按预期结束。指出原因并只修改更新表达式：\nfor (int i = 1; i <= 3; i--) cout << i << " ";','将i--改为i++；修复后输出1 2 3。','原程序中的i不断减小，在整数未溢出前始终满足i<=3；有符号整数溢出行为未定义，不能依靠溢出终止。修复后i达到4时结束。')
      ]
    };
  }
  if(/二分/.test(topic)){
    const task=(title,desc,output,sampleIn,sampleOut,core,analysis)=>programmingExercise(title,desc,'1 <= n <= 100；数组严格递增，元素和x均在-1000到1000之间','第一行n和x；第二行n个严格递增整数。',output,sampleIn,sampleOut,'    int n, x, a[101]; cin >> n >> x;\n    for (int i = 1; i <= n; i++) cin >> a[i];\n'+core,analysis);
    const find='    int l = 1, r = n, ans = -1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (a[m] == x) { ans = m; break; }\n        if (a[m] < x) l = m + 1;\n        else r = m - 1;\n    }\n    cout << ans << "\\n";';
    return {'随堂练习':[
      exercise('第1题｜适用条件','数组A={2,4,6,8}，数组B={4,2,8,6}。哪个数组可直接使用标准二分查找？为什么？','A可以，B不可以。','标准二分查找依赖有序性；B未按顺序排列，比较中间元素后不能安全排除半个区间。'),
      exercise('第2题｜中点计算','下标从1开始，l=2，r=7。计算m=l+(r-l)/2，整数除法向下取整。','m=4。','r-l=5，5/2=2，2+2=4。'),
      exercise('第3题｜区间更新','a={1,3,5,7,9}，下标1到5，查找9。第一轮l=1,r=5,m=3。写出下一轮l,r。','l=4，r=5。','a[3]=5<9，排除下标1到3，令l=m+1。'),
      exercise('第4题｜完整跟踪','在{2,4,6,8,10,12,14}中查找12，下标1到7。依次写出(l,r,m)。','(1,7,4)、(5,7,6)，在下标6找到12。','先比较8，目标更大；右半区中点为6，值为12。'),
      exercise('第5题｜找不到的目标','在{1,3,5}中查找4，初始l=1,r=3。写出每轮中点和最终区间。','m依次为2、3；最终l=3,r=2，未找到。','3<4令l=3，5>4令r=2，l>r终止。'),
      exercise('第6题｜纠错','代码写成if(a[m]<x) l=m;。n=2，a={1,3}，x=3，初始l=1,r=2。为什么可能不结束？如何修正？','m一直为1，l保持1；应改为l=m+1。','已经判断a[m]不等于x，应排除m，确保区间缩小。'),
      task('第7题｜上机：目标下标','使用二分查找x，存在则输出下标（从1开始），不存在输出-1。','一行一个整数下标或-1。','5 7\n1 3 5 7 9','4',find,'第一轮比较5，再比较7，找到下标4。'),
      task('第8题｜上机：存在性','使用二分查找判断x是否存在，存在输出YES，否则输出NO。','一行YES或NO。','3 4\n1 3 5','NO',find.replace('cout << ans << "\\n";','cout << (ans == -1 ? "NO" : "YES") << "\\n";'),'x=4不在数组中；l>r后输出NO。')
    ],'课后作业':[
      task('A1｜必做：查找学号','学号按严格递增排列，查找指定学号x，存在输出位置，否则-1。','一行下标或-1。','4 20\n10 20 30 40','2',find,'包含首元素、末元素和不存在三种测试。'),
      exercise('A2｜必做：纸笔跟踪','在数组{3,6,9,12,15,18}中查找3，初始l=1,r=6。写出每轮(l,r,m)和比较结果。','(1,6,3)：9>3；(1,2,1)：3=3，返回1。','每次取区间的下中点，排除已经比较的中点。'),
      task('B1｜选做：比较次数','使用标准二分查找x，输出实际比较a[m]的次数，包括找到时的比较。','一行整数次数。','7 12\n2 4 6 8 10 12 14','2',find.replace('int l = 1, r = n, ans = -1;','int l = 1, r = n, ans = -1, count = 0;').replace('int m = l + (r - l) / 2;','int m = l + (r - l) / 2; count++;').replace('cout << ans << "\\n";','cout << count << "\\n";'),'比较8和12，共2次。'),
      exercise('B2｜选做：遗漏末元素','代码使用while(l<r)，退出后直接返回-1。n=1，a={5}，x=5。写出原结果并修复循环条件。','原结果-1；条件改为l<=r。','单元素区间仍需比较；l=r时不能直接当作空区间。'),
      task('C1｜挑战：第一个不小于x','输出第一个>=x的元素下标；若不存在输出-1，不使用STL查找函数。','一行下标或-1。','5 6\n1 3 5 7 9','4','    int l=1, r=n, ans=-1;\n    while(l<=r) {\n        int m=l+(r-l)/2;\n        if(a[m]>=x) { ans=m; r=m-1; }\n        else l=m+1;\n    }\n    cout<<ans<<"\\n";','7是第一个>=6的值。命中候选时继续向左找。'),
      task('C2｜挑战：最后一个不大于x','输出最后一个<=x的元素下标；若不存在输出-1，不使用STL查找函数。','一行下标或-1。','5 6\n1 3 5 7 9','3','    int l=1, r=n, ans=-1;\n    while(l<=r) {\n        int m=l+(r-l)/2;\n        if(a[m]<=x) { ans=m; l=m+1; }\n        else r=m-1;\n    }\n    cout<<ans<<"\\n";','5是最后一个<=6的值。命中候选后继续向右找。')
    ]};
  }
  return null;
}
function questionRequirements(r){
  return '\n额外硬性要求：随堂练习与课后作业必须是学生不依赖教师补充材料就能直接作答的具体试卷。每一节对应一道真实题目。content使用【题目】【参考答案】【解析】【评分标准】标记。代码阅读、跟踪、补全、纠错题必须直接附完整C++代码与确定数据；不能写“给出一段代码”“以课堂代码为准”“完成一道相关题”“教师提供”“自行选择数据”。编程题额外包含【数据范围】【输入格式】【输出格式】【样例输入】【样例输出】，参考答案必须给出可编译C++17程序并解释样例和边界。随堂练习至少8题，课后作业至少6题，标清A必做/B选做/C挑战，与课程主题'+r.topic+'和已掌握知识一致。答案不能用占位描述。不要把反思记录或提交说明计作一道题。';
}
function validateQuestionMaterials(materials){
  for(const [key,min,label] of [['classPractice',8,'随堂练习'],['homework',6,'课后作业']]){
    const list=materials?.[key];
    if(!Array.isArray(list)||list.length<min)throw new Error(label+'数量不足，需重新生成');
    for(const q of list){
      const text=String(q?.content||'');
      if(!['【题目】','【参考答案】','【解析】','【评分标准】'].every(x=>text.includes(x))||
        /完成一道|给定一段|给出一段|教师提供|以课堂.*为准|阅读课堂示例|答案以.*为准/.test(text))
        throw new Error(label+'包含未写完整的题目，需重新生成');
      const programming=/(?:编程题|上机题|编程任务|上机任务)/.test(q.title)||(/编程|上机/.test(q.title)&&!/阅读|跟踪|补全|纠错|改错|判断|选择/.test(q.title))||/【输入格式】|【输出格式】/.test(text);
      if(programming&&!['【数据范围】','【输入格式】','【输出格式】','【样例输入】','【样例输出】'].every(x=>text.includes(x)))
        throw new Error(label+'缺少数据范围或输入输出样例');
      if(programming&&!/#include[\s\S]*main\s*\(/.test(text))throw new Error(label+'缺少完整参考程序');
      if(/代码|变量跟踪|补全|纠错/.test(q.title)&&!/[;{}]/.test(text))throw new Error(label+'缺少具体代码');
    }
  }
}

