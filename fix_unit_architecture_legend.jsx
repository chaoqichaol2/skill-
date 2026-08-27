#target photoshop

app.bringToFront();
app.displayDialogs = DialogModes.NO;

var doc = null;
for (var d = 0; d < app.documents.length; d++) {
    if (app.documents[d].name.indexOf("单元化架构_1000x700_分层") >= 0) {
        doc = app.documents[d];
        break;
    }
}
if (!doc) throw new Error("未找到单元化架构分层文档");
app.activeDocument = doc;
var oldUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;

function color(hex) {
    hex = hex.replace("#", "");
    var c = new SolidColor();
    c.rgb.red = parseInt(hex.substring(0, 2), 16);
    c.rgb.green = parseInt(hex.substring(2, 4), 16);
    c.rgb.blue = parseInt(hex.substring(4, 6), 16);
    return c;
}

function arrow(g, name, x, y, length, c) {
    var l = g.artLayers.add();
    l.name = name;
    doc.activeLayer = l;
    doc.selection.select([[x, y - 1], [x + length - 8, y - 1], [x + length - 8, y + 1], [x, y + 1]]);
    doc.selection.fill(c, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    doc.selection.select([[x + length - 9, y - 6], [x + length, y], [x + length - 9, y + 6]]);
    doc.selection.fill(c, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    return l;
}

var g = doc.layerSets.getByName("10_图例与署名");
try { g.artLayers.getByName("图例_交易调用方向箭头").visible = false; } catch (e) {}
try { g.artLayers.getByName("图例_数据流向箭头").visible = false; } catch (e) {}

arrow(g, "图例_交易调用方向_绘制箭头", 33, 643, 35, color("E60012"));
arrow(g, "图例_数据流向_绘制箭头", 244, 643, 35, color("7A7A7A"));

doc.save();
var pngOptions = new PNGSaveOptions();
pngOptions.compression = 6;
pngOptions.interlaced = false;
doc.saveAs(new File("/Users/bcs/Documents/设计师vibecoding/单元化架构_1000x700_预览.png"), pngOptions, true, Extension.LOWERCASE);

app.preferences.rulerUnits = oldUnits;
