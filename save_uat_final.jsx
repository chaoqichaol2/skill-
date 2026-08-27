#target photoshop

app.displayDialogs = DialogModes.NO;
var OUT = '/Users/bcs/Documents/设计师vibecoding/UAT专题攻坚区_可编辑分层.psd';
var PREVIEW_RAW = '/Users/bcs/Documents/设计师vibecoding/UAT专题攻坚区_预览_原尺寸.png';
var DONE = '/private/tmp/codex_uat_final_done.txt';
var target = null;

for (var i = 0; i < app.documents.length; i++) {
    try {
        if (app.documents[i].fullName.fsName === new File(OUT).fsName) target = app.documents[i];
    } catch (e) {}
}
if (!target) target = app.documents[0];
app.activeDocument = target;

var psd = new PhotoshopSaveOptions();
psd.layers = true;
psd.embedColorProfile = true;
psd.maximizeCompatibility = true;
target.saveAs(new File(OUT), psd, true, Extension.LOWERCASE);

var previewDoc = target.duplicate('UAT专题攻坚区_最终预览', true);
previewDoc.flatten();
var png = new PNGSaveOptions();
png.interlaced = false;
previewDoc.saveAs(new File(PREVIEW_RAW), png, true, Extension.LOWERCASE);
previewDoc.close(SaveOptions.DONOTSAVECHANGES);
app.activeDocument = target;

var marker = new File(DONE);
marker.open('w');
marker.write('OK|' + target.name);
marker.close();
