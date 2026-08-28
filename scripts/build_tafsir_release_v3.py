import json, re, shutil, subprocess, tempfile, unicodedata, time, html as htmlmod
from pathlib import Path
from urllib.parse import quote, urljoin
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; COVER_OUT=ROOT/'media'/'tafsir-covers'; RELEASE_OUT=ROOT/'build'/'tafsirmu-release'
TARGETS=DATA/'tafsir-40-targets.json'; MANIFEST=DATA/'tafsir-assets.json'
API='https://api.quranpedia.net/v1'; TIMEOUT=120
H={'User-Agent':'PustakaMu-TafsirMu/4.1'}


def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-') or 'tafsir'


def get_json(url, tries=4):
    last=None
    for n in range(tries):
        try:
            r=requests.get(url,headers=H,timeout=TIMEOUT)
            r.raise_for_status(); return r.json()
        except Exception as e:
            last=e
            if n+1<tries: time.sleep(1.5*(n+1))
    raise last


def list_books(j):
    if isinstance(j,dict):
        if isinstance(j.get('items'),list): return j['items']
        b=j.get('books')
        if isinstance(b,dict) and isinstance(b.get('items'),list): return b['items']
    if isinstance(j,list): return j
    return []


def norm(s):
    return re.sub(r'[^a-z0-9\u0600-\u06ff]+','',str(s or '').lower())


def pick(items,target):
    tq=norm(target.get('query')); ta=norm(target.get('author')); tt=norm(target.get('title'))
    scored=[]
    for x in items:
        b=x.get('book_info') if isinstance(x.get('book_info'),dict) else x
        n=norm(b.get('name')); a=norm(b.get('author')); typ=norm(b.get('type')); cat=norm(b.get('category'))
        s=0
        for q,weight in ((tq,12),(tt,10)):
            if q and (q==n): s=max(s,weight+6)
            elif q and (q in n or n in q): s=max(s,weight)
            elif q: s+=sum(2 for z in re.findall(r'[a-z0-9\u0600-\u06ff]{4,}',q) if z in n)
        if ta and (ta in a or a in ta): s+=7
        if 'tafsir' in typ or 'tafsir' in cat or 'تفسير' in str(b.get('category','')): s+=5
        scored.append((s,b))
    scored.sort(key=lambda z:z[0],reverse=True)
    return scored[0][1] if scored and scored[0][0]>=5 else None


def resolve(target):
    candidates=[]
    for q in (target.get('query',''),target.get('title','')):
        if not q: continue
        try: candidates += list_books(get_json(f'{API}/search/{quote(q,safe="")}/books'))
        except Exception: pass
    seen=set(); uniq=[]
    for x in candidates:
        b=x.get('book_info') if isinstance(x.get('book_info'),dict) else x
        k=b.get('id')
        if k not in seen: seen.add(k); uniq.append(b)
    book=pick(uniq,target)
    if not book: raise RuntimeError('kitab tafsir tidak ditemukan')
    detail=get_json(f'{API}/book/{book["id"]}')
    cat=detail.get('category') or {}
    catname=str(cat.get('name','') if isinstance(cat,dict) else cat).lower()
    if str(detail.get('type','')).lower() not in ('tafsir','') and 'tafsir' not in catname and 'تفسير' not in catname and 'أحكام القرآن' not in catname:
        raise RuntimeError('hasil bukan kitab tafsir')
    at=[]
    for a in detail.get('book_attachments') or []:
        u=urljoin(API+'/',str(a.get('url','')).strip())
        if u and re.search(r'\.(pdf|docx?|PDF|DOCX?)($|\?)',u): at.append((u,a.get('part',1)))
    pdfs=sorted({u for u,p in at if re.search(r'\.pdf($|\?)',u,re.I)}, key=lambda u:(next((p for v,p in at if v==u),1),u))
    docs=[u for u,p in at if re.search(r'\.(docx?|DOCX?)($|\?)',u)]
    return detail,pdfs,sorted(set(docs))


def run(cmd): subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)


def dl(url,dst):
    r=requests.get(url,headers=H,timeout=TIMEOUT,stream=True,allow_redirects=True); r.raise_for_status()
    if 'text/html' in r.headers.get('content-type','').lower(): raise RuntimeError('URL mengembalikan HTML, bukan dokumen')
    with dst.open('wb') as f:
        for c in r.iter_content(1024*1024):
            if c: f.write(c)


def build_pdf(urls,out):
    with tempfile.TemporaryDirectory() as td:
        t=Path(td); fs=[]
        for i,u in enumerate(urls,1):
            f=t/f'{i:03d}.pdf'; dl(u,f); fs.append(f)
        if not fs: raise RuntimeError('PDF kosong')
        if len(fs)==1: shutil.copy2(fs[0],out)
        else: run(['pdfunite',*map(str,fs),str(out)])


def build_docx(pdf,out):
    with tempfile.TemporaryDirectory() as td:
        t=Path(td); txt=t/f'{pdf.stem}.txt'
        try:
            run(['libreoffice','--headless','--convert-to','docx','--outdir',str(t),str(pdf)])
            made=t/(pdf.stem+'.docx')
            if made.exists() and made.stat().st_size>1000:
                shutil.copy2(made,out); return
        except Exception: pass
        run(['pdftotext','-layout',str(pdf),str(txt)])
        from docx import Document
        from docx.shared import Pt
        d=Document(); d.styles['Normal'].font.name='Noto Naskh Arabic'; d.styles['Normal'].font.size=Pt(10)
        for line in txt.read_text(errors='ignore').splitlines(): d.add_paragraph(line)
        d.save(out)


def cover(pdf,out): run(['pdftoppm','-f','1','-singlefile','-png','-r','160',str(pdf),str(out.with_suffix(''))])


def main():
    COVER_OUT.mkdir(parents=True,exist_ok=True); RELEASE_OUT.mkdir(parents=True,exist_ok=True)
    for d in (COVER_OUT,RELEASE_OUT):
        for f in d.iterdir():
            if f.is_file(): f.unlink()
    targets=json.loads(TARGETS.read_text(encoding='utf-8'))['items']
    items=[]; failures=[]
    for i,t in enumerate(targets,1):
        try:
            detail,pdfs,docs=resolve(t)
            if not pdfs: raise RuntimeError('tidak memiliki PDF')
            s=slug(t['title']); local_pdf=RELEASE_OUT/f'{s}.pdf'; build_pdf(pdfs,local_pdf)
            local_docx=RELEASE_OUT/f'{s}.docx'
            if docs:
                dl(docs[0],local_docx)
            else: build_docx(local_pdf,local_docx)
            c=COVER_OUT/f'{s}.png'; cover(local_pdf,c)
            if local_pdf.stat().st_size<5000 or local_docx.stat().st_size<1000 or not c.exists(): raise RuntimeError('asset tidak valid')
            items.append({'title':t['title'],'author':t.get('author',''),'language':'ar','category':'tafsir','type':'tafsir-book','publish_year':detail.get('publish_year',''),'parts':detail.get('parts',len(pdfs)),'quranpedia_book_id':detail.get('id'),'source_page':f'https://quranpedia.net/book/{detail.get("id")}', 'pdf_url':f'https://github.com/pcmsomagede/pcmsomagede.github.io/releases/download/tafsirmu-latest/{s}.pdf','docx_url':f'https://github.com/pcmsomagede/pcmsomagede.github.io/releases/download/tafsirmu-latest/{s}.docx','cover_url':f'/media/tafsir-covers/{s}.png'})
            print('OK',i,t['title'])
        except Exception as e:
            failures.append({'title':t['title'],'error':str(e)}); print('FAIL',i,t['title'],e)
    if failures or len(items)!=40: raise SystemExit(f'FAILED TafsirMu: {len(items)}/40')
    MANIFEST.write_text(json.dumps({'generated':'2026-08-28','total':40,'items':items},ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__': main()
