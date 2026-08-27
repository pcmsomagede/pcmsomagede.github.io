#!/usr/bin/env python3
"""Keep only published, usable PustakaMu records."""
import json
from pathlib import Path
CAT=Path('data/pustaka-catalog.json')

def local_exists(v):
    s=str(v or '').strip()
    return bool(s) and (not s.startswith('/') or Path(s.lstrip('/')).exists())

def usable(x):
    title=str(x.get('title') or x.get('name') or '').strip()
    pdf=str(x.get('pdf_source') or x.get('pdf_url') or x.get('pdfUrl') or x.get('pdf') or '').strip()
    docx=str(x.get('docx_source') or x.get('docx_url') or x.get('docxUrl') or '').strip()
    cover=str(x.get('cover_url') or x.get('coverUrl') or x.get('cover_path') or '').strip()
    return bool(title and (local_exists(pdf) or local_exists(docx)) and (not cover or local_exists(cover)))

def main():
    if not CAT.exists(): return
    cat=json.loads(CAT.read_text(encoding='utf-8'));items=[];seen=set()
    for x in cat.get('items') or []:
        if x.get('status')=='index-only' or x.get('source')=='legacy-index' or not usable(x): continue
        k=str(x.get('title') or x.get('name') or '').strip().casefold()
        if k and k not in seen: seen.add(k);items.append(x)
    cat['items']=items;cat['total']=len(items)
    CAT.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'PustakaMu visible records: {len(items)}')
if __name__=='__main__': main()
