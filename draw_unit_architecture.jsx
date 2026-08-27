#target photoshop

app.bringToFront();
app.displayDialogs = DialogModes.NO;

var oldUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;

var W = 1000;
var H = 700;
var FONT = "FZLanTingHeiS-DB-GB";
var OUT_PSD = "/Users/bcs/Documents/设计师vibecoding/单元化架构_1000x700_分层_最终版.psd";
var OUT_PNG = "/Users/bcs/Documents/设计师vibecoding/单元化架构_1000x700_最终预览.png";

function color(hex) {
    hex = hex.replace("#", "");
    var c = new SolidColor();
    c.rgb.red = parseInt(hex.substring(0, 2), 16);
    c.rgb.green = parseInt(hex.substring(2, 4), 16);
    c.rgb.blue = parseInt(hex.substring(4, 6), 16);
    return c;
}

var C = {
    red: color("E60012"),
    deepRed: color("CC0011"),
    paleRed: color("FFF6F6"),
    text: color("303030"),
    midText: color("5B5B5B"),
    gray: color("7A7A7A"),
    border: color("D6D6D6"),
    midBorder: color("A8A8A8"),
    panel: color("FAFAFA"),
    soft: color("F3F3F3"),
    white: color("FFFFFF")
};

var doc = app.documents.add(W, H, 72, "单元化架构_1000x700", NewDocumentMode.RGB, DocumentFill.WHITE);
doc.backgroundLayer.name = "00_白色背景";

function group(name) {
    var g = doc.layerSets.add();
    g.name = name;
    return g;
}

function pathPoint(ax, ay, lx, ly, rx, ry, smooth) {
    var p = new PathPointInfo();
    p.kind = smooth ? PointKind.SMOOTHPOINT : PointKind.CORNERPOINT;
    p.anchor = [ax, ay];
    p.leftDirection = [lx, ly];
    p.rightDirection = [rx, ry];
    return p;
}

function roundedSelection(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    var k = 0.55228475;
    var pts = [];
    pts.push(pathPoint(x + r, y, x + r - k * r, y, x + r, y, true));
    pts.push(pathPoint(x + w - r, y, x + w - r, y, x + w - r + k * r, y, true));
    pts.push(pathPoint(x + w, y + r, x + w, y + r - k * r, x + w, y + r, true));
    pts.push(pathPoint(x + w, y + h - r, x + w, y + h - r, x + w, y + h - r + k * r, true));
    pts.push(pathPoint(x + w - r, y + h, x + w - r + k * r, y + h, x + w - r, y + h, true));
    pts.push(pathPoint(x + r, y + h, x + r, y + h, x + r - k * r, y + h, true));
    pts.push(pathPoint(x, y + h - r, x, y + h - r + k * r, x, y + h - r, true));
    pts.push(pathPoint(x, y + r, x, y + r, x, y + r - k * r, true));
    var sub = new SubPathInfo();
    sub.closed = true;
    sub.operation = ShapeOperation.SHAPEADD;
    sub.entireSubPath = pts;
    var pth = doc.pathItems.add("__rounded_rect__", [sub]);
    pth.makeSelection(0, true, SelectionType.REPLACE);
    pth.remove();
}

function fillSelection(fillColor) {
    if (fillColor) doc.selection.fill(fillColor, ColorBlendMode.NORMAL, 100, false);
}

function rect(g, name, x, y, w, h, fillColor, strokeColor, strokeWidth, radius) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    roundedSelection(x, y, w, h, radius || 0);
    if (fillColor) fillSelection(fillColor);
    if (strokeColor && strokeWidth > 0) {
        doc.selection.stroke(strokeColor, strokeWidth, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
    }
    doc.selection.deselect();
    return l;
}

function addText(g, name, txt, x, y, size, fillColor, align, leading) {
    var l = g.artLayers.add();
    l.name = name;
    l.kind = LayerKind.TEXT;
    var t = l.textItem;
    t.contents = txt;
    try { t.font = FONT; } catch (e) {}
    t.size = UnitValue(size, "px");
    t.color = fillColor;
    t.position = [UnitValue(x, "px"), UnitValue(y, "px")];
    t.justification = align || Justification.LEFT;
    if (leading) {
        t.useAutoLeading = false;
        t.leading = UnitValue(leading, "px");
    }
    t.antiAliasMethod = AntiAlias.STRONG;
    return l;
}

function addParagraph(g, name, txt, x, y, w, h, size, fillColor, leading) {
    var l = g.artLayers.add();
    l.name = name;
    l.kind = LayerKind.TEXT;
    var t = l.textItem;
    t.kind = TextType.PARAGRAPHTEXT;
    t.contents = txt;
    try { t.font = FONT; } catch (e) {}
    t.size = UnitValue(size, "px");
    t.color = fillColor;
    t.position = [UnitValue(x, "px"), UnitValue(y, "px")];
    t.width = UnitValue(w, "px");
    t.height = UnitValue(h, "px");
    t.justification = Justification.LEFT;
    t.useAutoLeading = false;
    t.leading = UnitValue(leading || size * 1.55, "px");
    t.antiAliasMethod = AntiAlias.STRONG;
    return l;
}

function box(g, name, label, x, y, w, h, fillColor, strokeColor, textColor, fontSize, radius, strokeWidth) {
    rect(g, name + "_底框", x, y, w, h, fillColor, strokeColor, strokeWidth == null ? 1 : strokeWidth, radius == null ? 5 : radius);
    addText(g, name + "_文字", label, x + w / 2, y + h / 2 + fontSize * 0.34, fontSize, textColor, Justification.CENTER);
}

function dbIcon(g, name, x, y, iconColor) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    roundedSelection(x, y, 18, 7, 3.5); fillSelection(iconColor); doc.selection.deselect();
    roundedSelection(x, y + 5, 18, 7, 3.5); fillSelection(iconColor); doc.selection.deselect();
    roundedSelection(x, y + 10, 18, 7, 3.5); fillSelection(iconColor); doc.selection.deselect();
    return l;
}

function arrow(g, name, x, y, length, arrowColor) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    doc.selection.select([[x, y - 1], [x + length - 8, y - 1], [x + length - 8, y + 1], [x, y + 1]]);
    doc.selection.fill(arrowColor, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    doc.selection.select([[x + length - 9, y - 6], [x + length, y], [x + length - 9, y + 6]]);
    doc.selection.fill(arrowColor, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    return l;
}

// 01 顶部标题
var gHeader = group("01_标题栏");
rect(gHeader, "标题栏_红色底", 0, 0, 333, 40, C.deepRed, null, 0, 0);
rect(gHeader, "画布_红色描边", 0, 0, 1000, 700, null, C.red, 1, 0);
addText(gHeader, "标题_图标", "◎", 21, 28, 24, C.white, Justification.LEFT);
addText(gHeader, "标题_单元化架构", "单元化架构", 56, 28, 22, C.white, Justification.LEFT);

// 02 主体容器
var gContainer = group("02_主体容器");
rect(gContainer, "主体_大面板", 16, 58, 968, 623, C.white, C.border, 1, 8);

// 03 外面层
var gOuter = group("03_外面层");
box(gOuter, "外面层_标签", "外面层", 32, 72, 78, 32, C.gray, null, C.white, 15, 5, 0);
var tabs = [
    ["柜面", 122, 72, 106], ["手机银行", 240, 72, 114], ["渠道客服", 366, 72, 114],
    ["银联 / 网联", 492, 72, 108], ["信贷", 612, 72, 86], ["贸易金融", 710, 72, 90],
    ["资金交易", 812, 72, 86], ["……", 910, 72, 58]
];
for (var i = 0; i < tabs.length; i++) {
    box(gOuter, "外面层_" + tabs[i][0], tabs[i][0], tabs[i][1], tabs[i][2], tabs[i][3], 32, C.soft, C.border, C.text, 12, 5, 1);
}
addText(gOuter, "外面层_下行箭头", "↓", 546, 117, 23, C.gray, Justification.CENTER);

// 04 转发层
var gForward = group("04_转发层");
box(gForward, "转发层_标签", "转发层", 32, 121, 78, 33, C.white, C.midBorder, C.gray, 15, 5, 1);
box(gForward, "转发层_ICOP_ESB", "ICOP / ESB · 服务转发枢纽", 122, 121, 399, 33, C.soft, C.border, C.text, 14, 4, 1);
box(gForward, "转发层_批量平台", "批量平台 · 文件转发枢纽", 534, 121, 434, 33, C.soft, C.border, C.text, 14, 4, 1);
addText(gForward, "转发层_下行箭头", "↓", 501, 174, 23, C.red, Justification.CENTER);

// 05 接入层
var gAccess = group("05_接入层");
box(gAccess, "接入层_标签", "接入层", 32, 179, 78, 34, C.red, null, C.white, 15, 5, 0);
box(gAccess, "接入层_网关", "网关 · 全行交易统一入口", 122, 179, 399, 34, C.white, C.red, C.red, 14, 4, 1);
box(gAccess, "接入层_路由", "路由 · 按客户要素定位目标单元", 534, 179, 434, 34, C.white, C.red, C.red, 14, 4, 1);
addText(gAccess, "接入层_下行箭头", "↓", 501, 232, 23, C.red, Justification.CENTER);

// 06 调度层
var gSchedule = group("06_调度层");
box(gSchedule, "调度层_标签", "调度层", 32, 234, 78, 33, C.white, C.red, C.red, 14, 5, 1);
box(gSchedule, "调度层_注册中心", "注册中心 · 服务注册与发现", 122, 234, 399, 33, C.soft, C.border, C.text, 14, 4, 1);
box(gSchedule, "调度层_任务调度", "任务调度 · 批量任务统一调度", 534, 234, 434, 33, C.soft, C.border, C.text, 14, 4, 1);
addText(gSchedule, "调度层_下行箭头", "↓", 501, 287, 23, C.red, Justification.CENTER);

// 07 业务服务层
var gService = group("07_业务服务层");
rect(gService, "业务服务层_左侧红底", 32, 289, 78, 185, C.deepRed, null, 0, 7);
addText(gService, "业务服务层_竖排文字", "业务\r服务层", 71, 369, 18, C.white, Justification.CENTER, 28);
rect(gService, "业务服务层_存款服务大框", 122, 289, 601, 185, C.white, C.red, 1, 7);
addText(gService, "存款服务_标题", "存款服务", 134, 312, 14, C.red, Justification.LEFT);
addText(gService, "存款服务_说明", "（已单元化，共 11 个单元）", 195, 312, 12, C.red, Justification.LEFT);
addText(gService, "管理单元_规则说明", "统一管理单元划分与路由规则", 199, 333, 11, C.midText, Justification.LEFT);

rect(gService, "管理单元_红底", 133, 334, 61, 128, C.deepRed, null, 0, 6);
addText(gService, "管理单元_竖排文字", "管\r理\r单\r元", 163.5, 371, 18, C.white, Justification.CENTER, 25);

var unitXs = [202, 332, 462, 592];
for (i = 0; i < 4; i++) {
    box(gService, "个人客户单元_" + (i + 1), "个人客户单元 " + (i + 1), unitXs[i], 340, 122, 35, C.red, null, C.white, 12, 5, 0);
}
for (i = 0; i < 4; i++) {
    box(gService, "个人客户单元_" + (i + 5), "个人客户单元 " + (i + 5), unitXs[i], 383, 122, 35, C.red, null, C.white, 12, 5, 0);
}
box(gService, "公司客户单元_1", "公司客户单元 1", 202, 426, 253, 36, C.red, null, C.white, 13, 5, 0);
box(gService, "公司客户单元_2", "公司客户单元 2", 462, 426, 252, 36, C.red, null, C.white, 13, 5, 0);

addText(gService, "存款服务_右侧括号", "}", 728, 388, 99, C.gray, Justification.CENTER);
box(gService, "公共服务", "公共服务（柜员 · 机构 · 凭证）", 749, 289, 219, 38, C.white, C.midBorder, C.text, 12, 5, 1);
box(gService, "资金内部户服务", "资金内部户服务（内部户）", 749, 334, 219, 38, C.white, C.midBorder, C.text, 12, 5, 1);
box(gService, "聚合服务", "聚合服务（单元数据汇聚 · 跨单元查询）", 749, 379, 219, 38, C.white, C.midBorder, C.text, 11, 5, 1);
box(gService, "会计服务", "会计服务（核算 · 清算 · 科目总账）", 749, 424, 219, 41, C.white, C.red, C.red, 12, 5, 1);
addText(gService, "业务服务层_下行箭头", "↓", 501, 495, 23, C.red, Justification.CENTER);

// 08 数据层
var gData = group("08_数据层");
box(gData, "数据层_标签", "数据层", 32, 499, 78, 41, C.white, C.midBorder, C.gray, 15, 5, 1);
rect(gData, "集中式数据库群_大框", 122, 499, 603, 41, C.soft, C.border, 1, 5);
dbIcon(gData, "集中式数据库群_图标", 133, 511, C.gray);
addText(gData, "集中式数据库群_标题", "集中式数据库群", 158, 527, 13, C.text, Justification.LEFT);
box(gData, "数据层_各业务单元库", "各业务单元库", 312, 506, 121, 28, C.white, C.border, C.gray, 11, 14, 1);
box(gData, "数据层_网关路由调度库", "网关路由调度库", 445, 506, 126, 28, C.white, C.border, C.gray, 11, 14, 1);
box(gData, "数据层_公共内部户聚合库", "公共内部户聚合库", 584, 506, 132, 28, C.white, C.border, C.gray, 11, 14, 1);
rect(gData, "会计库_独立数据库_底框", 749, 499, 219, 41, C.white, C.red, 1, 5);
dbIcon(gData, "会计库_图标", 767, 511, C.red);
addText(gData, "会计库_文字", "会计库（独立数据库）", 793, 527, 13, C.red, Justification.LEFT);

// 09 运行逻辑
var gLogic = group("09_运行逻辑说明");
rect(gLogic, "运行逻辑_说明底框", 32, 557, 936, 60, C.soft, C.border, 1, 5);
rect(gLogic, "运行逻辑_信息圆", 46, 574, 23, 23, C.red, null, 0, 12);
addText(gLogic, "运行逻辑_信息字母", "i", 57.5, 592, 14, C.white, Justification.CENTER);
addParagraph(gLogic, "运行逻辑_正文", "运行逻辑：交易经网关统一接入 → 路由按客户要素定位目标单元 → 请求由对应业务单元处理；管理单元统一管理单元划分与路由规则；\r交易按需调用公共、资金内部户服务；汇聚业务单元数据到聚合服务；会计分录整合到会计服务。", 82, 570, 865, 42, 11.5, C.text, 21);

// 10 图例与署名
var gLegend = group("10_图例与署名");
arrow(gLegend, "图例_交易调用方向箭头", 33, 643, 35, C.red);
addText(gLegend, "图例_交易调用方向文字", "交易调用方向（自上而下）", 78, 652, 11, C.midText, Justification.LEFT);
arrow(gLegend, "图例_数据流向箭头", 244, 643, 35, C.gray);
addText(gLegend, "图例_数据流向文字", "数据流向（跨单元聚合 / 落库）", 287, 652, 11, C.midText, Justification.LEFT);
rect(gLegend, "图例_红框样例", 489, 635, 16, 18, C.white, C.red, 1, 3);
addText(gLegend, "图例_红框说明", "红框：会计条线（独立数据库）", 516, 651, 11, C.midText, Justification.LEFT);
addText(gLegend, "页脚_项目名", "长沙银行 · 核心业务系统架构升级项目", 967, 652, 10.5, C.gray, Justification.RIGHT);

// 保存分层 PSD 和预览 PNG，并保持 PSD 在 Photoshop 中打开。
var psdOptions = new PhotoshopSaveOptions();
psdOptions.layers = true;
psdOptions.embedColorProfile = true;
doc.saveAs(new File(OUT_PSD), psdOptions, false, Extension.LOWERCASE);

var pngOptions = new PNGSaveOptions();
pngOptions.compression = 6;
pngOptions.interlaced = false;
doc.saveAs(new File(OUT_PNG), pngOptions, true, Extension.LOWERCASE);

app.preferences.rulerUnits = oldUnits;
doc.activeLayer = gHeader;
