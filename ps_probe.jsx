#target photoshop

var marker = new File('/private/tmp/codex_ps_probe.txt');
marker.open('w');
marker.write(app.version + '|' + app.documents.length);
marker.close();
