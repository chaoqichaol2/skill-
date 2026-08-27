#target photoshop

app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

var SRC = '/var/folders/c4/1sv_yqhd2_s88nmhgzlxw7t40000gn/T/codex-clipboard-cfa1cf82-9e66-49d2-a17e-bc4bdce89f80.png';
var OUT = '/Users/bcs/Documents/设计师vibecoding/UAT专题攻坚区_可编辑分层.psd';
var PREVIEW = '/Users/bcs/Documents/设计师vibecoding/UAT专题攻坚区_预览.png';
var DONE = '/private/tmp/codex_uat_ps_done.txt';

var W = 6770, H = 1310;
var RED = 'C90012', RED2 = 'E60012', DARKRED = '8E0010';
var GOLD = 'E8B25C', PALEGOLD = 'F7E8CE';
var WHITE = 'FFFFFF', WARM = 'FFFCF7', INK = '222222', GRAY = '777777';

function color(hex) {
    var c = new SolidColor();
    c.rgb.red = parseInt(hex.substr(0, 2), 16);
    c.rgb.green = parseInt(hex.substr(2, 2), 16);
    c.rgb.blue = parseInt(hex.substr(4, 2), 16);
    return c;
}

function group(parent, name) {
    var g = parent.layerSets.add();
    g.name = name;
    return g;
}

function moveInto(layer, parent) {
    if (parent) layer.move(parent, ElementPlacement.INSIDE);
    return layer;
}

function fillRect(parent, name, x, y, w, h, hex, opacity) {
    app.activeDocument = doc;
    var l = doc.artLayers.add();
    l.name = name;
    doc.selection.select([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
    doc.selection.fill(color(hex));
    doc.selection.deselect();
    if (opacity !== undefined) l.opacity = opacity;
    moveInto(l, parent);
    return l;
}

function borderPanel(parent, name, x, y, w, h, border, fill) {
    app.activeDocument = doc;
    var l = doc.artLayers.add();
    l.name = name;
    doc.selection.select([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
    doc.selection.fill(color(border));
    doc.selection.select([[x+2,y+2],[x+w-2,y+2],[x+w-2,y+h-2],[x+2,y+h-2]]);
    doc.selection.fill(color(fill));
    doc.selection.deselect();
    moveInto(l, parent);
    return l;
}

function line(parent, name, x1, y1, x2, y2, thickness, hex) {
    if (Math.abs(y2-y1) <= Math.abs(x2-x1)) {
        return fillRect(parent, name, Math.min(x1,x2), Math.min(y1,y2), Math.max(1,Math.abs(x2-x1)), thickness, hex, 100);
    }
    return fillRect(parent, name, Math.min(x1,x2), Math.min(y1,y2), thickness, Math.max(1,Math.abs(y2-y1)), hex, 100);
}

function textLayer(parent, name, value, x, y, size, hex, weight, width, leading, align) {
    var l = doc.artLayers.add();
    l.name = name;
    l.kind = LayerKind.TEXT;
    var t = l.textItem;
    t.contents = value;
    t.color = color(hex || INK);
    t.size = UnitValue(size, 'pt');
    t.position = [UnitValue(x, 'px'), UnitValue(y, 'px')];
    try { t.font = weight === 'bold' ? 'PingFangSC-Semibold' : 'PingFangSC-Regular'; } catch (e) {}
    if (width) {
        t.kind = TextType.PARAGRAPHTEXT;
        t.width = UnitValue(width, 'px');
        t.height = UnitValue(Math.max(size*2, leading ? leading*8 : size*7), 'px');
    }
    if (leading) t.leading = UnitValue(leading, 'pt');
    if (align === 'center') t.justification = Justification.CENTER;
    if (align === 'right') t.justification = Justification.RIGHT;
    moveInto(l, parent);
    return l;
}

function panel(parent, name, title, x, y, w, h, titleW) {
    var g = group(parent, name);
    borderPanel(g, '模块底框', x, y, w, h, 'D97452', WARM);
    fillRect(g, '标题红条', x+14, y+10, titleW || 360, 54, RED, 100);
    fillRect(g, '标题金边', x+14, y+61, titleW || 360, 4, GOLD, 100);
    textLayer(g, '标题文字', title, x+38, y+49, 28, WHITE, 'bold');
    return g;
}

function cell(parent, name, label, x, y, w, h, fill, txt, size) {
    borderPanel(parent, name + '_底框', x, y, w, h, 'E5D2BF', fill || WHITE);
    textLayer(parent, name + '_文字', label, x+w/2, y+h/2+size/3, size || 18, txt || INK, 'regular', w-12, size*1.35, 'center');
}

function dot(parent, name, label, x, y, hex, size) {
    textLayer(parent, name, '●', x, y, size || 28, hex, 'bold');
    if (label) textLayer(parent, name+'_说明', label, x+34, y, 18, INK, 'regular');
}

var doc = app.documents.add(UnitValue(W,'px'), UnitValue(H,'px'), 72, 'UAT专题攻坚区_可编辑分层', NewDocumentMode.RGB, DocumentFill.WHITE);

// Base and reference artwork.
var baseGroup = group(doc, '00_背景与参考');
fillRect(baseGroup, '纯色背景', 0, 0, W, H, WARM, 100);
var refDoc = app.open(new File(SRC));
var copied = refDoc.activeLayer.duplicate(doc, ElementPlacement.PLACEATEND);
refDoc.close(SaveOptions.DONOTSAVECHANGES);
app.activeDocument = doc;
copied.name = '参考原图_低透明度_可隐藏';
copied.opacity = 18;
copied.move(baseGroup, ElementPlacement.INSIDE);
copied.allLocked = true;

// Header.
var header = group(doc, '01_顶部主视觉');
fillRect(header, '标题净底', 2430, 8, 2050, 154, WARM, 94);
fillRect(header, '左红飘带', 0, 0, 1160, 34, RED, 92);
fillRect(header, '右红飘带', 5710, 12, 1060, 30, RED2, 90);
textLayer(header, '主标题', 'UAT 专项攻坚区', 3370, 112, 68, RED, 'bold', 1700, 80, 'center');
fillRect(header, '使命标语底', 2885, 136, 1000, 54, DARKRED, 100);
textLayer(header, '使命标语', '全 力 以 赴   使 命 必 达', 3385, 176, 27, WHITE, 'bold', 900, 32, 'center');
textLayer(header, '左装饰星', '✦  ✦  ✦', 2400, 138, 24, GOLD, 'bold');
textLayer(header, '右装饰星', '✦  ✦  ✦', 4430, 138, 24, GOLD, 'bold');

// Left target panel.
var left = group(doc, '02_左侧_目标与组织');
var goal = panel(left, 'A_项目建设总目标', '◎  项目建设总目标', 90, 225, 1400, 275, 440);
textLayer(goal, '目标正文_01', '建设架构先进、安全稳固、自主可控的新一代核心业务系统，', 140, 320, 26, INK, 'regular');
textLayer(goal, '目标正文_02', '为全行业务发展和战略落地导航，为金融数字化转型创新', 140, 368, 26, INK, 'regular');
textLayer(goal, '目标正文_03', '突破和降本增效打造可复制、可推广的示范模板。', 140, 416, 26, INK, 'regular');
textLayer(goal, '目标强调箭头', '➜', 1280, 430, 84, PALEGOLD, 'bold');

var org = panel(left, 'B_项目组织架构', '◎  项目组织架构', 90, 515, 1400, 715, 420);
fillRect(org, '领导小组红条', 230, 595, 1120, 44, RED, 100);
textLayer(org, '领导小组标题', '项目领导小组', 790, 627, 23, WHITE, 'bold', 500, 28, 'center');
textLayer(org, '领导小组成员', '组长：营销信息室     副组长：金融根科部、开发中心、数据中心、运营管理部', 260, 680, 19, INK, 'regular');
fillRect(org, '办公室红条', 230, 725, 1120, 42, RED, 100);
textLayer(org, '办公室标题', '项目管理办公室', 790, 756, 22, WHITE, 'bold', 500, 26, 'center');
textLayer(org, '办公室成员', '主任：场宁     成员：项目管理、测试管理、质量与风险管理人员', 260, 807, 19, INK, 'regular');
var teams = ['架构组','开发组','测试组','投产组','基础设施组','业务组/UAT组','外围组'];
var people = ['组长：栋宇\r成员：架构专家','组长：周韵\r成员：开发骨干','组长：万唯\r成员：测试骨干','组长：观毅\r成员：投产保障','组长：林宇平\r成员：基础设施','组长：颜航\r成员：业务及UAT','组长：谢扬\r成员：外围系统'];
for (var i=0;i<teams.length;i++) {
    var tw = i===5 ? 230 : 145;
    var tx = 105 + i*175;
    if (i>5) tx += 85;
    borderPanel(org, '小组卡片_'+teams[i], tx, 870, tw, 280, '9D9D9D', WHITE);
    fillRect(org, '小组标题底_'+teams[i], tx, 870, tw, 42, RED, 100);
    textLayer(org, '小组标题_'+teams[i], teams[i], tx+tw/2, 902, 18, WHITE, 'bold', tw-10, 22, 'center');
    textLayer(org, '小组人员_'+teams[i], people[i], tx+12, 950, 16, INK, 'regular', tw-24, 25);
}
textLayer(org, '组织架构备注', '注：数据每周更新   ｜   负责人：UAT团队   ｜   更新时间：2024-05-20', 620, 1200, 18, '9A684F', 'regular', 850, 22, 'center');

// Honor board.
var honorWrap = group(doc, '03_荣誉榜');
var honor = panel(honorWrap, 'A_UAT荣誉榜', '✹  UAT 荣誉榜 · 星光', 1540, 225, 700, 360, 430);
var stars = ['物超之星','缺陷之星','进步之星','金牌业务组'];
for (var s=0;s<4;s++) {
    var sx=1570+s*165;
    textLayer(honor, '荣誉名称_'+(s+1), stars[s], sx+78, 310, 20, DARKRED, 'bold', 150, 24, 'center');
    textLayer(honor, '荣誉徽章_'+(s+1), '★', sx+78, 415, 70, GOLD, 'bold', 130, 76, 'center');
    fillRect(honor, '星光丝带_'+(s+1), sx+25, 440, 110, 38, RED, 100);
    textLayer(honor, '星光文字_'+(s+1), '星光', sx+80, 469, 18, WHITE, 'bold', 100, 22, 'center');
    cell(honor, '荣誉宣言_'+(s+1), '宣言', sx+18, 500, 124, 58, WARM, INK, 22);
}

// Timeline / Gantt.
var middle = group(doc, '04_中部_全局里程碑');
var gantt = panel(middle, 'A_全局里程碑计划图', '◎  全局里程碑计划/图', 2290, 225, 1310, 1005, 500);
textLayer(gantt, '阶段_2024', '2024年', 2900, 310, 18, WHITE, 'bold', 760, 22, 'center');
fillRect(gantt, '年份红条_2024', 2470, 280, 860, 40, RED, 100);
fillRect(gantt, '年份红条_2025', 3330, 280, 220, 40, RED2, 100);
textLayer(gantt, '阶段_2025', '2025年', 3440, 310, 18, WHITE, 'bold', 180, 22, 'center');
for (var m=0;m<18;m++) {
    var mx=2470+m*58;
    line(gantt, '月份分隔_'+(m+1), mx, 320, mx, 1185, 1, 'E2E2E2');
    textLayer(gantt, '月份_'+(m+1), ((m+7)%12+1)+'月', mx+29, 350, 13, INK, 'regular', 52, 16, 'center');
}
var tasks=['1.项目启动会','2.架构设计确认','3.系统开发完成','4.集成测试完成','5.全行用户验收完成','6.系统投产','7.试运行开始','8.业务切换完成','9.稳定运行','10.项目总结','11.项目收尾'];
var starts=[0,3,3,6,7,8,9,10,11,12,15];
var lens=[4,3,5,5,5,8,6,7,7,6,3];
for (var t=0;t<tasks.length;t++) {
    var ty=392+t*68;
    textLayer(gantt, '任务_'+(t+1), tasks[t], 2315, ty+20, 15, INK, 'regular');
    fillRect(gantt, '任务进度条_'+(t+1), 2470+starts[t]*58, ty, lens[t]*58, 18, RED2, 100);
    textLayer(gantt, '任务日期_'+(t+1), '202'+(t<2?'4':'5')+'/'+String((starts[t]%12)+1).replace(/^([0-9])$/,'0$1')+'/15', 2470+starts[t]*58-5, ty-5, 12, INK, 'regular');
}

// Architecture.
var archWrap = group(doc, '05_中右_单元化架构');
var arch = panel(archWrap, 'A_单元化架构', '◎  单元化架构', 3650, 225, 1050, 1005, 370);
var channels=['柜面','手机银行','企业网银','渠道/集群','开放平台','行内平台'];
cell(arch,'用户层标签','用户层',3680,305,100,44,'5E5B3D',WHITE,18);
for (var c=0;c<channels.length;c++) cell(arch,'渠道_'+(c+1),channels[c],3800+c*138,305,128,44,WHITE,INK,16);
cell(arch,'接入层标签','接入层',3680,382,100,44,'6D6846',WHITE,18);
cell(arch,'接入层_ECC','ECC / 专线 / 负载均衡',3800,382,395,44,'F6F6F6',INK,16);
cell(arch,'接入层_网关','防火墙 / 统一外围入网',4210,382,430,44,'F6F6F6',INK,16);
cell(arch,'接入通标签','接入通',3680,465,100,44,RED,WHITE,18);
cell(arch,'接入通_入口','RX、会话保持、入口',3800,465,395,44,WHITE,RED,16);
cell(arch,'接入通_路由','路由 / 服务注册与服务分发',4210,465,430,44,WHITE,RED,16);
cell(arch,'应用层标签','应用层',3680,548,100,44,RED,WHITE,18);
cell(arch,'应用层_应用中心','应用中心、微服务注册发现',3800,548,395,44,'F6F6F6',INK,15);
cell(arch,'应用层_全链路','全链路、可观测治理中枢',4210,548,430,44,'F6F6F6',INK,15);
fillRect(arch,'核心单元竖栏',3680,650,100,210,RED,100);
textLayer(arch,'核心单元竖字','核心\r单元层',3710,706,23,WHITE,'bold',42,38,'center');
var units=['存款单元+','支付单元+','贷款单元+','信用卡单元+','账户单元+','客户单元+','总账单元+','报表单元+','公共基础单元','消息中心单元'];
for (var u=0;u<8;u++) cell(arch,'业务单元_'+(u+1),units[u],3800+(u%4)*205,650+Math.floor(u/4)*70,190,58,RED2,WHITE,15);
cell(arch,'公共基础单元',units[8],3800,802,395,54,RED2,WHITE,15);
cell(arch,'消息中心单元',units[9],4210,802,430,54,RED2,WHITE,15);
cell(arch,'平台层标签','平台层',3680,922,100,44,'888888',WHITE,18);
var platforms=['容器/微服务框架','分布式中间件','数据库镜像','分布式报文队列'];
for (var p=0;p<4;p++) cell(arch,'平台_'+(p+1),platforms[p],3800+p*205,922,190,44,'F6F6F6',GRAY,14);
fillRect(arch,'私域说明底',3680,1010,960,100,'F5F5F5',100);
textLayer(arch,'私域说明标题','● 私域联 / 单元化 / 容灾中心（多机房、多多可用区）',3700,1045,18,DARKRED,'bold');
textLayer(arch,'私域说明正文','通过服务化、池化、分布式架构，提升应用高可用、快速响应、安全可控与持续演进能力。',3700,1082,16,INK,'regular');
dot(arch,'图例_安全','安全体系（纵深防护）',3705,1160,RED,22);
textLayer(arch,'图例_安全补充','统一身份认证、权限管理、数据加密、审计、日志、风控/合规',3900,1160,15,INK,'regular');

// Right stacked modules.
var right = group(doc, '06_右侧_军令状与任务状态');
var wall = panel(right, 'A_目标墙', '◈  目标墙 · UAT 军令状', 4770,225,920,285,500);
var bullets=['上线零重大缺陷；','考评全员 C 等以上；','案例完成率 100%；'];
for(var b=0;b<bullets.length;b++) {
    textLayer(wall,'盾牌_'+(b+1),'◈',4830,326+b*62,26,RED,'bold');
    textLayer(wall,'目标_'+(b+1),bullets[b],4890,326+b*62,25,INK,'bold');
}
var sign = panel(right, 'B_UAT主体成员签名', '✎  UAT 主体成员签名', 4770,525,920,210,470);
for (var sg=0;sg<4;sg++) {
    line(sign,'签名线_'+(sg+1),4825+(sg%2)*410,625+Math.floor(sg/2)*58,5180+(sg%2)*410,625+Math.floor(sg/2)*58,2,'D8C3AD');
    textLayer(sign,'签名标签_'+(sg+1),['业务代表：','技术代表：','测试代表：','项目负责人：'][sg],4825+(sg%2)*410,612+Math.floor(sg/2)*58,15,GRAY,'regular');
}
var status = panel(right, 'C_挂图作战状态', '◎  挂图作战 · UAT 任务状态图', 4770,750,920,250,600);
var heads=['任务名称','需求确认','开发准备','测评对象','测评中'];
for(var h=0;h<heads.length;h++) cell(status,'表头_'+(h+1),heads[h],4800+h*172,840,165,44,RED,WHITE,17);
var projects=['XXX项目','XXX项目','平台改造项目','个人业务项目'];
for(var pr=0;pr<4;pr++) {
    cell(status,'项目_'+(pr+1),projects[pr],4800,888+pr*45,165,42,WHITE,INK,16);
    for(var st=0;st<4;st++) dot(status,'状态_'+(pr+1)+'_'+(st+1),'',5025+st*172,922+pr*45,[ '00843D','B4B800','F2A000','D7000F'][(pr+st)%4],18);
}
var style = panel(right, 'D_UAT风采墙', '◉  UAT 风采墙', 4770,1015,920,215,390);
for(var ph=0;ph<3;ph++) {
    borderPanel(style,'照片模块_'+(ph+1),4810+ph*285,1095,260,105,'D8C3AD','FFF9F2');
    textLayer(style,'照片说明_'+(ph+1),['团队协作','攻坚现场','荣耀时刻'][ph],4940+ph*285,1160,19,DARKRED,'bold',220,24,'center');
}

// Far-right progress board.
var far = group(doc, '07_进度里程碑');
var prog = panel(far, 'A_进度UAT里程碑', '◷  进度 · UAT 里程碑', 5800,225,880,1005,500);
var milestones=['8月启动进组 →','12月全面回归 →','1月首轮考评 →','5月二轮考评 · 上线'];
for(var mi=0;mi<milestones.length;mi++) {
    line(prog,'里程碑竖线_'+(mi+1),5930,322+mi*75,5930,380+mi*75,3,RED);
    dot(prog,'里程碑节点_'+(mi+1),'',5915,336+mi*75,RED,26);
    textLayer(prog,'里程碑文字_'+(mi+1),milestones[mi],5970,355+mi*75,28,DARKRED,'bold');
}
fillRect(prog,'进度表表头底',5850,685,780,54,RED,100);
var phs=['任务名称','需求确认','开发准备','测评中'];
for(var q=0;q<4;q++) textLayer(prog,'进度表头_'+(q+1),phs[q],5945+q*190,722,19,WHITE,'bold',170,24,'center');
var rows=['XXX项目','XXX项目','平台改造项目','个人业务项目','XXX项目'];
for(var rr=0;rr<rows.length;rr++) {
    line(prog,'行分隔_'+(rr+1),5850,785+rr*65,6630,785+rr*65,1,'E2D4C8');
    textLayer(prog,'进度项目_'+(rr+1),rows[rr],5940,778+rr*65,17,INK,'regular',170,22,'center');
    dot(prog,'确认_'+(rr+1),'',6120,778+rr*65,'00843D',20);
    dot(prog,'准备_'+(rr+1),'',6310,778+rr*65,rr<2?'B4B800':'F2A000',20);
    dot(prog,'测评_'+(rr+1),'',6495,778+rr*65,rr<2?'F2A000':'D7000F',20);
}
fillRect(prog,'合计底',5850,1105,780,72,'4B2624',100);
textLayer(prog,'合计标题','合计',5940,1152,19,WHITE,'bold',170,24,'center');
textLayer(prog,'合计确认','100%',6125,1152,20,WHITE,'bold',170,24,'center');
textLayer(prog,'合计准备','80%',6315,1152,20,WHITE,'bold',170,24,'center');
textLayer(prog,'合计测评','60%',6500,1152,20,WHITE,'bold',170,24,'center');
dot(prog,'图例已完成','已完成',5850,1210,'00843D',18);
dot(prog,'图例进行中','进行中',6040,1210,'B4B800',18);
dot(prog,'图例有风险','有风险',6230,1210,'F2A000',18);
dot(prog,'图例未开始','未开始',6420,1210,'D7000F',18);

// Guide layer.
var notes = group(doc, '99_图层说明（可隐藏）');
textLayer(notes,'编辑提示','编辑提示：所有标题、正文、表格文字均为独立文字图层；各功能块已按区域分组。',120,1278,15,'9A684F','regular');

// Save layered PSD and flattened preview.
app.activeDocument = doc;
var psdOptions = new PhotoshopSaveOptions();
psdOptions.layers = true;
psdOptions.embedColorProfile = true;
psdOptions.maximizeCompatibility = true;
doc.saveAs(new File(OUT), psdOptions, true, Extension.LOWERCASE);

var previewDoc = doc.duplicate('UAT专题攻坚区_预览', true);
previewDoc.flatten();
var pngOptions = new PNGSaveOptions();
pngOptions.interlaced = false;
previewDoc.saveAs(new File(PREVIEW), pngOptions, true, Extension.LOWERCASE);
previewDoc.close(SaveOptions.DONOTSAVECHANGES);
app.activeDocument = doc;

var marker = new File(DONE);
marker.open('w');
marker.write('OK|' + doc.layers.length + '|' + OUT + '|' + PREVIEW);
marker.close();
