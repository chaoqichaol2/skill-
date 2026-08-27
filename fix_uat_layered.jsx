#target photoshop

app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

var OUT = '/Users/bcs/Documents/设计师vibecoding/UAT专题攻坚区_可编辑分层.psd';
var PREVIEW = '/Users/bcs/Documents/设计师vibecoding/UAT专题攻坚区_预览.png';
var DONE = '/private/tmp/codex_uat_fix_done.txt';
var target = null;

for (var i = 0; i < app.documents.length; i++) {
    try {
        if (app.documents[i].fullName.fsName === new File(OUT).fsName) target = app.documents[i];
    } catch (e) {}
}
if (!target) target = app.documents[0];
app.activeDocument = target;

var textCount = 0, groupCount = 0, shiftedCount = 0, symbolCount = 0;

function safeSymbols(value) {
    var v = value;
    v = v.replace(/✦/g, '★');
    v = v.replace(/✹/g, '◎');
    v = v.replace(/◈/g, '◎');
    v = v.replace(/✎/g, '◎');
    v = v.replace(/◉/g, '◎');
    v = v.replace(/◷/g, '◎');
    return v;
}

function walk(container) {
    for (var j = 0; j < container.layers.length; j++) {
        var layer = container.layers[j];
        if (layer.typename === 'LayerSet') {
            groupCount++;
            walk(layer);
        } else if (layer.kind === LayerKind.TEXT) {
            textCount++;
            var t = layer.textItem;
            var replaced = safeSymbols(t.contents);
            if (replaced !== t.contents) {
                t.contents = replaced;
                symbolCount++;
            }
            if (t.kind === TextType.PARAGRAPHTEXT && t.justification === Justification.CENTER) {
                var amount = t.width.as('px') / 2;
                layer.translate(UnitValue(-amount, 'px'), UnitValue(0, 'px'));
                shiftedCount++;
            }
        }
    }
}

walk(target);
target.save();

var previewDoc = target.duplicate('UAT专题攻坚区_预览_修正版', true);
previewDoc.flatten();
var png = new PNGSaveOptions();
png.interlaced = false;
previewDoc.saveAs(new File(PREVIEW), png, true, Extension.LOWERCASE);
previewDoc.close(SaveOptions.DONOTSAVECHANGES);
app.activeDocument = target;

var marker = new File(DONE);
marker.open('w');
marker.write('OK|texts=' + textCount + '|groups=' + groupCount + '|centerFixed=' + shiftedCount + '|symbolsFixed=' + symbolCount);
marker.close();
