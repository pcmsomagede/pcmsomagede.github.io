#!/usr/bin/env python3
"""Keep PustakaMu catalog useful when an upstream crawl returns too little data.
Never deletes a previously known record; merges the legacy index as index-only records.
"""
import json
from pathlib import Path

CAT=Path('data/pustaka-catalog.json')
BOOKS=Path('data/pustaka-books.json')

def main():
    cat=json.loads(CAT.read_text(encoding='utf-8')) if CAT.exists() else {'items':[]}
    legacy=json.loads(BOOKS.read_text(encoding='utf-8')) if BOOKS.exists() else {'items':[]}
    items=cat.get('items') or []
    seen={str(x.get('title') or x.get('name') or '').strip().casefold() for x in items}
    added=0
    for x in legacy.get('items') or []:
        title=str(x.get('title') or x.get('name') or '').strip()
        if not title: continue
        k=title.casefold()
        if k in seen: continue
        items.append({'title':title,'category':x.get('category','Referensi'),'status':'index-only','source':'legacy-index'})
        seen.add(k);added+=1
    cat['items']=items
    cat['total']=len(items)
    if added or not CAT.exists(): CAT.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'PustakaMu catalog: {len(items)} records ({added} index records added)')

if __name__=='__main__': main()
