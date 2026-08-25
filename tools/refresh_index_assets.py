from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('fast-ui.js?v=20260825-2','fast-ui.js?v=20260825-3')
s=re.sub(r'src="quran-ui\.js(?:\?[^\"]*)?"','src="quran-ui.js?v=20260825-3"',s)
s=re.sub(r'src="arsip-ui\.js(?:\?[^\"]*)?"','src="arsip-ui.js?v=20260825-3"',s)
if 'arsip-preview.js?v=20260825-3' not in s:
    s=s.replace('<script src="arsip-ui.js?v=20260825-3" defer></script>','<script src="arsip-ui.js?v=20260825-3" defer></script><script src="arsip-preview.js?v=20260825-3" defer></script>')
if 'manifest.webmanifest' not in s:
    s=s.replace('</head>','<link rel="manifest" href="manifest.webmanifest"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"></head>')
p.write_text(s,encoding='utf-8')
