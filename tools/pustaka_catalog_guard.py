#!/usr/bin/env python3
"""Preserve only usable PustakaMu records.
A record is catalog-ready only when it has a real PDF and a real cover path/URL.
This guard never manufactures placeholder cards from the legacy title index.
"""
import json
from pathlib import Path

CAT=Path('data/pustaka-catalog.json')

def usable(x):
    pdf=str(x.get('pdf_source') or x.get('pdf_url') or x.get('pdfUrl') or x.get('pdf') or '').strip()
    cover=str(x.get('cover_url') or x.get('coverUrl') or x.get('cover_path') or '').strip()
    title=str(x.get('title') or x.get('name') or '').strip()
    return bool(title and pdf and cover)

def main():
    if not CAT.exists():
        CAT.write_text(json.dumps({'items':[],'total':0},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('PustakaMu catalog: 0 records')
        return
    cat=json.loads(CAT.read_text(encoding='utf-8'))
    src=cat.get('items') or []
    items=[];seen=set()
    for x in src:
        if not usable(x):
            continue
        title=str(x.get('title') or x.get('name')).strip()
        k=title.casefold()
        if k in seen:
            continue
        seen.add(k);items.append(x)
    cat['items']=items
    cat['total']=len(items)
    CAT.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'PustakaMu catalog: {len(items)} usable records')

if __name__=='__main__': main()
