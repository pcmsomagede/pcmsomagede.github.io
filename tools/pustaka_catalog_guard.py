#!/usr/bin/env python3
# Guard published PustakaMu records; Arabic-safe Khutbah repair runs before this.
import json,re
from pathlib import Path
CAT=Path('data/pustaka-catalog.json')
def local(v):
 s=str(v or '').strip(); return bool(s) and (not s.startswith('/') or Path(s.lstrip('/')).exists())
def remote(v): return bool(re.match(r'^https?://',str(v or '').strip(),re.I))
def usable(x):
 title=str(x.get('title') or x.get('name') or '').strip()
 if not title:return False
 typ=str(x.get('type') or '').lower()
 if typ=='tafsir-book' and remote(x.get('source_page')):return True
 pdf=x.get('pdf_source') or x.get('pdf_url') or x.get('pdfUrl') or x.get('pdf')
 docx=x.get('docx_source') or x.get('docx_url') or x.get('docxUrl')
 cover=x.get('cover_url') or x.get('coverUrl') or x.get('cover_path')
 return (local(pdf) or remote(pdf) or local(docx) or remote(docx)) and (not cover or local(cover) or remote(cover))
def main():
 if not CAT.exists():return
 cat=json.loads(CAT.read_text(encoding='utf-8'));out=[];seen=set()
 for x in cat.get('items') or []:
  if x.get('status') in {'index-only','legacy-index'} or not usable(x):continue
  k=(str(x.get('category') or '').casefold(),str(x.get('title') or x.get('name') or '').casefold())
  if k not in seen:seen.add(k);out.append(x)
 cat['items']=out;cat['total']=len(out);CAT.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('PustakaMu visible records:',len(out))
if __name__=='__main__':main()
