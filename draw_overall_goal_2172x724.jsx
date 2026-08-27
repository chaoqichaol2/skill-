#target photoshop

app.bringToFront();
app.displayDialogs = DialogModes.NO;

var oldUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;

var W = 2172;
var H = 724;
var FONT = "FZLanTingHeiS-DB-GB";
var OUT_PSD = "/Users/bcs/Documents/设计师vibecoding/单元化架构_总体目标_2172x724_分层_最终版.psd";
var OUT_PNG = "/Users/bcs/Documents/设计师vibecoding/单元化架构_总体目标_2172x724_最终预览.png";

function color(hex) {
    hex = hex.replace("#", "");
    var c = new SolidColor();
    c.rgb.red = parseInt(hex.substring(0, 2), 16);
    c.rgb.green = parseInt(hex.substring(2, 4), 16);
    c.rgb.blue = parseInt(hex.substring(4, 6), 16);
    return c;
}

var C = {
    red: color("E50012"),
    darkRed: color("C90012"),
    iconRed: color("D91F2C"),
    paleRed: color("FFF4F2"),
    lightRed: color("F7C7C7"),
    softRed: color("FCE2DF"),
    text: color("171717"),
    gray: color("5A5A5A"),
    white: color("FFFFFF"),
    cream: color("FFFCF8")
};

var doc = app.documents.add(W, H, 72, "单元化架构_总体目标_2172x724", NewDocumentMode.RGB, DocumentFill.WHITE);
doc.backgroundLayer.name = "00_暖白背景";

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

function ellipseSelection(x, y, w, h) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
    desc.putReference(charIDToTypeID("null"), ref);
    var bounds = new ActionDescriptor();
    bounds.putUnitDouble(charIDToTypeID("Top "), charIDToTypeID("#Pxl"), y);
    bounds.putUnitDouble(charIDToTypeID("Left"), charIDToTypeID("#Pxl"), x);
    bounds.putUnitDouble(charIDToTypeID("Btom"), charIDToTypeID("#Pxl"), y + h);
    bounds.putUnitDouble(charIDToTypeID("Rght"), charIDToTypeID("#Pxl"), x + w);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Elps"), bounds);
    desc.putBoolean(charIDToTypeID("AntA"), true);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function rect(g, name, x, y, w, h, fillColor, strokeColor, strokeWidth, radius, opacity) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    roundedSelection(x, y, w, h, radius || 0);
    if (fillColor) doc.selection.fill(fillColor, ColorBlendMode.NORMAL, 100, false);
    if (strokeColor && strokeWidth > 0) doc.selection.stroke(strokeColor, strokeWidth, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    if (opacity != null) l.opacity = opacity;
    return l;
}

function ellipse(g, name, x, y, w, h, fillColor, strokeColor, strokeWidth, opacity) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    ellipseSelection(x, y, w, h);
    if (fillColor) doc.selection.fill(fillColor, ColorBlendMode.NORMAL, 100, false);
    if (strokeColor && strokeWidth > 0) doc.selection.stroke(strokeColor, strokeWidth, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    if (opacity != null) l.opacity = opacity;
    return l;
}

function polygon(g, name, points, fillColor, opacity) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    doc.selection.select(points);
    doc.selection.fill(fillColor, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    if (opacity != null) l.opacity = opacity;
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

function dashedLine(g, name, x, y, width, dash, gap, lineColor) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    for (var dx = 0; dx < width; dx += dash + gap) {
        var dw = Math.min(dash, width - dx);
        doc.selection.select([[x + dx, y], [x + dx + dw, y], [x + dx + dw, y + 2], [x + dx, y + 2]]);
        doc.selection.fill(lineColor, ColorBlendMode.NORMAL, 100, false);
        doc.selection.deselect();
    }
    return l;
}

function lineRect(g, layer, x, y, w, h, c) {
    doc.activeLayer = layer;
    roundedSelection(x, y, w, h, 2);
    doc.selection.stroke(c, 4, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
}

function iconMonitor(g, x, y) {
    ellipse(g, "图标1_红色圆", x, y, 76, 76, C.iconRed, null, 0, 100);
    var l = g.artLayers.add(); l.name = "图标1_显示器与齿轮";
    lineRect(g, l, x + 20, y + 20, 36, 26, C.white);
    doc.activeLayer = l;
    doc.selection.select([[x + 35, y + 46], [x + 41, y + 46], [x + 41, y + 54], [x + 35, y + 54]]);
    doc.selection.fill(C.white, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
    doc.selection.select([[x + 27, y + 53], [x + 50, y + 53], [x + 50, y + 57], [x + 27, y + 57]]);
    doc.selection.fill(C.white, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
    ellipseSelection(x + 48, y + 42, 16, 16); doc.selection.stroke(C.white, 3, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
}

function iconInterface(g, x, y) {
    ellipse(g, "图标2_红色圆", x, y, 76, 76, C.iconRed, null, 0, 100);
    var l = g.artLayers.add(); l.name = "图标2_接口检索";
    lineRect(g, l, x + 22, y + 20, 34, 39, C.white);
    doc.activeLayer = l;
    ellipseSelection(x + 32, y + 31, 14, 14); doc.selection.stroke(C.white, 3, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
    doc.selection.select([[x + 43, y + 42], [x + 55, y + 54], [x + 52, y + 57], [x + 40, y + 45]]);
    doc.selection.fill(C.white, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
}

function iconClipboard(g, x, y) {
    ellipse(g, "图标3_红色圆", x, y, 76, 76, C.iconRed, null, 0, 100);
    var l = g.artLayers.add(); l.name = "图标3_清单";
    lineRect(g, l, x + 23, y + 20, 32, 40, C.white);
    lineRect(g, l, x + 32, y + 16, 14, 9, C.white);
    doc.activeLayer = l;
    var ys = [34, 42, 50];
    for (var i = 0; i < ys.length; i++) {
        doc.selection.select([[x + 31, y + ys[i]], [x + 49, y + ys[i]], [x + 49, y + ys[i] + 3], [x + 31, y + ys[i] + 3]]);
        doc.selection.fill(C.white, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
    }
}

function iconAI(g, x, y) {
    ellipse(g, "图标4_红色圆", x, y, 76, 76, C.iconRed, null, 0, 100);
    var l = g.artLayers.add(); l.name = "图标4_AI头像轮廓";
    doc.activeLayer = l;
    doc.selection.select([[x + 24, y + 55], [x + 19, y + 48], [x + 20, y + 31], [x + 28, y + 21], [x + 43, y + 18], [x + 55, y + 25], [x + 59, y + 38], [x + 53, y + 50], [x + 45, y + 55]]);
    doc.selection.stroke(C.white, 3, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
    ellipseSelection(x + 31, y + 25, 24, 24); doc.selection.stroke(C.white, 3, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false); doc.selection.deselect();
    addText(g, "图标4_AI文字", "AI", x + 43, y + 43, 13, C.white, Justification.CENTER);
}

// 01 背景与装饰
var gBg = group("01_背景与装饰");
rect(gBg, "背景_暖白覆盖", 0, 0, W, H, C.cream, null, 0, 0, 100);
polygon(gBg, "背景_左上淡红光带", [[0, 0], [330, 0], [100, 170], [0, 230]], C.softRed, 28);
polygon(gBg, "背景_右侧淡红光带", [[1740, 90], [2172, 140], [2172, 450], [1900, 600]], C.softRed, 24);
ellipse(gBg, "背景_中部淡红光晕", 315, 510, 1470, 164, C.softRed, null, 0, 42);
ellipse(gBg, "背景_底部细椭圆线1", 210, 513, 1660, 196, null, C.lightRed, 2, 45);
ellipse(gBg, "背景_底部细椭圆线2", 303, 528, 1462, 146, null, C.lightRed, 2, 70);

// 02 左上标题条
var gTitle = group("02_左上标题条");
rect(gTitle, "标题条_红色底", 0, 5, 262, 42, C.darkRed, null, 0, 0, 100);
rect(gTitle, "标题条_底部金线", 0, 46, 262, 3, color("E8B52B"), null, 0, 0, 100);
polygon(gTitle, "标题条_右侧折角", [[262, 5], [309, 5], [263, 47]], C.red, 80);
polygon(gTitle, "标题条_右侧高光", [[282, 5], [309, 5], [283, 28]], C.white, 65);
addText(gTitle, "标题条_圆形符号", "◎", 20, 35, 27, C.white, Justification.LEFT);
addText(gTitle, "标题条_单元化架构", "单元化架构", 54, 36, 27, C.white, Justification.LEFT);

// 03 总体目标
var gGoal = group("03_总体目标");
ellipse(gGoal, "总体目标_椭圆底框", 312, 51, 1458, 145, C.white, C.red, 2, 96);
addText(gGoal, "总体目标_标题", "总体目标：", 431, 127, 49, C.darkRed, Justification.LEFT);
rect(gGoal, "总体目标_分隔线1", 725, 66, 2, 93, C.lightRed, null, 0, 0, 100);
rect(gGoal, "总体目标_分隔线2", 1064, 66, 2, 93, C.lightRed, null, 0, 0, 100);
rect(gGoal, "总体目标_分隔线3", 1391, 66, 2, 93, C.lightRed, null, 0, 0, 100);
addText(gGoal, "目标1_100", "100%", 891, 110, 62, C.darkRed, Justification.CENTER);
addText(gGoal, "目标1_系统范围", "系统范围", 891, 158, 29, C.text, Justification.CENTER);
addText(gGoal, "目标2_100", "100%", 1228, 110, 62, C.darkRed, Justification.CENTER);
addText(gGoal, "目标2_接口范围", "接口范围", 1228, 158, 29, C.text, Justification.CENTER);
addText(gGoal, "目标3_100", "100%", 1556, 110, 62, C.darkRed, Justification.CENTER);
addText(gGoal, "目标3_功能范围", "功能范围", 1556, 158, 29, C.text, Justification.CENTER);

// 04 四张内容卡片
var gCards = group("04_四张内容卡片");
rect(gCards, "卡片1_底框", 209, 208, 394, 312, C.paleRed, C.lightRed, 1, 14, 72);
rect(gCards, "卡片2_底框", 634, 208, 399, 312, C.paleRed, C.lightRed, 1, 14, 72);
rect(gCards, "卡片3_底框", 1054, 208, 395, 312, C.paleRed, C.lightRed, 1, 14, 72);
rect(gCards, "卡片4_底框", 1474, 208, 364, 312, C.paleRed, C.lightRed, 1, 14, 72);

addText(gCards, "卡片1_标题", "系统全覆盖", 255, 271, 34, C.darkRed, Justification.LEFT);
iconMonitor(gCards, 494, 218);
addText(gCards, "卡片1_正文1", "测试范围内的所有系统", 255, 326, 23, C.text, Justification.LEFT);
addText(gCards, "卡片1_100", "100%", 255, 360, 26, C.red, Justification.LEFT);
addText(gCards, "卡片1_正文2", "全覆盖测试。", 321, 360, 23, C.text, Justification.LEFT);
dashedLine(gCards, "卡片1_分隔虚线", 255, 385, 310, 8, 5, C.lightRed);
addText(gCards, "卡片1_97", "97", 255, 430, 26, C.red, Justification.LEFT);
addText(gCards, "卡片1_正文3", "个关联外围系统、", 287, 430, 23, C.text, Justification.LEFT);
addText(gCards, "卡片1_51", "51", 468, 430, 26, C.red, Justification.LEFT);
addText(gCards, "卡片1_正文4", "个外联", 500, 430, 23, C.text, Justification.LEFT);
addText(gCards, "卡片1_正文5", "第三方、大数据和下游系统", 255, 468, 23, C.text, Justification.LEFT);
addText(gCards, "卡片1_35", "35", 255, 504, 26, C.red, Justification.LEFT);
addText(gCards, "卡片1_正文6", "个。", 287, 504, 23, C.text, Justification.LEFT);

addText(gCards, "卡片2_标题", "接口全覆盖", 679, 271, 34, C.darkRed, Justification.LEFT);
iconInterface(gCards, 920, 218);
addText(gCards, "卡片2_正文1", "通过外围及柜面系统前端交易，", 679, 326, 23, C.text, Justification.LEFT);
addText(gCards, "卡片2_正文2", "核心改造接口", 679, 360, 23, C.text, Justification.LEFT);
addText(gCards, "卡片2_100", "100%", 814, 360, 26, C.red, Justification.LEFT);
addText(gCards, "卡片2_正文3", "全覆盖。", 882, 360, 23, C.text, Justification.LEFT);
dashedLine(gCards, "卡片2_分隔虚线", 679, 385, 318, 8, 5, C.lightRed);
addText(gCards, "卡片2_正文4", "外围系统涉及强关联交易链路", 679, 430, 23, C.text, Justification.LEFT);
addText(gCards, "卡片2_9286", "9286", 679, 468, 26, C.red, Justification.LEFT);
addText(gCards, "卡片2_正文5", "个，核心联机接口", 742, 468, 23, C.text, Justification.LEFT);
addText(gCards, "卡片2_691", "691", 921, 468, 26, C.red, Justification.LEFT);
addText(gCards, "卡片2_正文6", "个，", 967, 468, 23, C.text, Justification.LEFT);
addText(gCards, "卡片2_正文7", "批量", 679, 504, 23, C.text, Justification.LEFT);
addText(gCards, "卡片2_227", "227", 725, 504, 26, C.red, Justification.LEFT);
addText(gCards, "卡片2_正文8", "个。", 770, 504, 23, C.text, Justification.LEFT);

addText(gCards, "卡片3_标题", "功能全覆盖", 1094, 271, 34, C.darkRed, Justification.LEFT);
iconClipboard(gCards, 1325, 218);
addText(gCards, "卡片3_正文1", "保证本次涉及创新改造及架构", 1094, 326, 23, C.text, Justification.LEFT);
addText(gCards, "卡片3_正文2", "升级关联接口交易覆盖", 1094, 360, 23, C.text, Justification.LEFT);
addText(gCards, "卡片3_100a", "100%", 1316, 360, 26, C.red, Justification.LEFT);
addText(gCards, "卡片3_正文3", "。", 1385, 360, 23, C.text, Justification.LEFT);
dashedLine(gCards, "卡片3_分隔虚线", 1094, 385, 318, 8, 5, C.lightRed);
addText(gCards, "卡片3_正文4", "确保监测报表及模型覆盖率达", 1094, 430, 23, C.text, Justification.LEFT);
addText(gCards, "卡片3_100b", "100%", 1094, 468, 26, C.red, Justification.LEFT);
addText(gCards, "卡片3_正文5", "，保障数据连续性和正确性。", 1163, 468, 23, C.text, Justification.LEFT);

addText(gCards, "卡片4_标题", "AI自动化测试", 1518, 271, 34, C.darkRed, Justification.LEFT);
iconAI(gCards, 1746, 221);
addText(gCards, "卡片4_正文1", "AI自动化测试交付", 1518, 383, 23, C.text, Justification.LEFT);
addText(gCards, "卡片4_10774", "10774", 1518, 424, 27, C.red, Justification.LEFT);
addText(gCards, "卡片4_正文2", "个案例。", 1595, 424, 23, C.text, Justification.LEFT);

// 05 底部说明
var gNote = group("05_底部说明");
ellipse(gNote, "底部说明_淡红椭圆底", 380, 532, 1313, 116, C.softRed, null, 0, 52);
addText(gNote, "底部说明_第一行", "测试工作旨在发现项目建设阶段产生的各类功能、性能、数据、交互、安全等相关问题，", 1086, 575, 23, C.text, Justification.CENTER);
addText(gNote, "底部说明_第二行", "提升系统健壮性和稳定性，确保核心业务系统改造升级高质量投产及投产后平稳运行。", 1086, 610, 23, C.text, Justification.CENTER);

// 06 底部红色飘带
var gWave = group("06_底部红色飘带");
polygon(gWave, "飘带_浅红层", [[0, 600], [270, 632], [540, 682], [920, 696], [1420, 686], [1780, 651], [2040, 590], [2172, 525], [2172, 724], [0, 724]], color("F6A2A2"), 55);
polygon(gWave, "飘带_中红层", [[0, 601], [310, 655], [660, 710], [1230, 724], [1670, 697], [1935, 642], [2172, 565], [2172, 724], [0, 724]], color("F23B46"), 75);
polygon(gWave, "飘带_亮红层", [[0, 621], [260, 671], [550, 710], [870, 724], [1470, 724], [1810, 690], [2050, 635], [2172, 600], [2172, 724], [0, 724]], C.red, 92);
polygon(gWave, "飘带_深红前景", [[0, 650], [220, 700], [420, 724], [0, 724]], C.darkRed, 100);
polygon(gWave, "飘带_右下深红前景", [[1640, 724], [1870, 690], [2172, 625], [2172, 724]], C.darkRed, 100);
polygon(gWave, "飘带_白色高光", [[0, 623], [340, 675], [720, 704], [1240, 705], [1700, 671], [2172, 578], [2172, 594], [1710, 690], [1250, 721], [700, 720], [320, 691], [0, 642]], C.white, 60);

// 保存并保持最终 PSD 在 Photoshop 中打开。
var psdOptions = new PhotoshopSaveOptions();
psdOptions.layers = true;
psdOptions.embedColorProfile = true;
doc.saveAs(new File(OUT_PSD), psdOptions, false, Extension.LOWERCASE);

var pngOptions = new PNGSaveOptions();
pngOptions.compression = 6;
pngOptions.interlaced = false;
doc.saveAs(new File(OUT_PNG), pngOptions, true, Extension.LOWERCASE);

app.preferences.rulerUnits = oldUnits;
doc.activeLayer = gTitle;
