#target photoshop

var out = new File('/private/tmp/codex_uat_inspect.txt');
out.open('w');
for (var d = 0; d < app.documents.length; d++) {
    var dd = app.documents[d];
    out.writeln('DOC[' + d + ']=' + dd.name + '|' + dd.width.as('px') + 'x' + dd.height.as('px') + '|ppi=' + dd.resolution);
}
var doc = app.documents[0];
app.activeDocument = doc;

function walk(container, depth) {
    for (var i = 0; i < container.layers.length; i++) {
        var l = container.layers[i];
        if (l.name === '模块底框' || l.name === '标题文字' || l.name === '主标题') {
            var b = l.bounds;
            out.writeln(new Array(depth + 1).join('  ') + l.name + '|' + b[0].as('px') + ',' + b[1].as('px') + ',' + b[2].as('px') + ',' + b[3].as('px'));
        }
        if (l.typename === 'LayerSet') walk(l, depth + 1);
    }
}

out.writeln('INSPECT=' + doc.name + '|' + doc.width.as('px') + 'x' + doc.height.as('px') + '|ppi=' + doc.resolution);
walk(doc, 0);
out.close();
