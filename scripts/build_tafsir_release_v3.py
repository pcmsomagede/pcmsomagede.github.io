import json, re, shutil, subprocess, tempfile, unicodedata
from pathlib import Path
from urllib.parse import quote
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; COVER_OUT=ROOT/'media'/'tafsir-covers'; RELEASE_OUT=ROOT/'build'/'tafsirmu-release'
TARGETS=DATA/'tafsir-40-targets.json'; MANIFEST=DATA/'tafsir-assets.json'
API='https://api.quranpedia.net/v1'; TIMEOUT=120
H={'User-Agent':'PustakaMu-TafsirMu/3.0'}


def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-') or 'tafsir'

def get_json(url):
    r=requests.get(url,headers=H,timeout=TIMEOUT); r.raise_for_status(); return r.json()

def resolve(target):
    queries=[target.get('query',''), target.get('title','')]
    candidates=[]
    for q in queries:
        if not q: continue
        try:
            j=get_json(f'{API}/search/{quote(q,safe="")}/books')
            candidates += j.get('books',{}).get('items',[]) or []
        except Exception: pass
    wanted=str(target.get('author','')).lower()
    tq=str(target.get('query','')).lower()
    seen=set(); scored=[]
    for x in candidates:
        if x.get('id') in seen: continue
        seen.add(x.get('id'))
        n=str(x.get('name','')).lower(); a=str(x.get('author','')).lower(); score=0
        if tq and (tq in n or n in tq): score+=5
        for w in re.findall(r'\w{4,}',wanted):
            if w in a: score+=1
        if str(x.get('type','')).lower()=='tafsir': score+=3
        scored.append((score,x))
    scored.sort(key=lambda z:z[0],reverse=True)
    if not scored: raise RuntimeError('tidak ditemukan')
    book=scored[0][1]
    detail=get_json(f'{API}/book/{book["id"]}')
    cat=str(detail.get('category',{}).get('name','')).lower()
    if str(detail.get('type','')).lower()!='tafsir' and 'tafsir' not in cat and 'أحكام القرآن' not in cat: raise RuntimeError('hasil bukan tafsir')
    pdf=[]; doc=[]
    for a in detail.get('book_attachments') or []:
        u=str(a.get('url','')).strip(); low=u.lower().split('?')[0]
        if low.endswith('.pdf'): pdf.append(u)
        elif low.endswith('.docx') or low.endswith('.doc'): doc.append(u)
    if not pdf and not doc: raise RuntimeError('tidak ada lampiran')
    return detail, sorted(dict.fromkeys(pdf)), sorted(dict.fromkeys(doc))

def run(cmd): subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)

def dl(url,dst):
    r=requests.get(url,headers=H,timeout=TIMEOUT,stream=True); r.raise_for_status()
    with dst.open('wb') as f:
        for c in r.iter_content(1024*1024):
            if c: f.write(c)

def build_pdf(urls,out):
    with tempfile.TemporaryDirectory() as td:
        t=Path(td); fs=[]
        for i,u in enumerate(urls,1):
            f=t/f'{i:03d}.pdf'; dl(u,f); fs.append(f)
        if len(fs)==1: shutil.copy2(fs[0],out)
        else: run(['pdfunite',*map(str,fs),str(out)])

def build_docx(pdf,out):
    with tempfile.TemporaryDirectory() as td:
        t=Path(td)
        try:
            run(['libreoffice','--headless','--convert-to','docx','--outdir',str(t),str(pdf)])
            made=t/(pdf.stem+'.docx')
            if made.exists() and made.stat().st_size>1000: shutil.copy2(made,out); return
        except Exception: pass
        txt=t/(pdf.stem+'.txt'); run(['pdftotext','-layout',str(pdf),str(txt)])
        from docx import Document
        from docx.shared import Pt
        d=Document(); d.styles['Normal'].font.name='Noto Sans'; d.styles['Normal'].font.size=Pt(10)
        for line in txt.read_text(errors='ignore').splitlines(): d.add_paragraph(line)
        d.save(out)

def cover(pdf,out): run(['pdftoppm','-f','1','-singlefile','-png','-r','150',str(pdf),str(out.with_suffix(''))])

def main():
    COVER_OUT.mkdir(parents=True,exist_ok=True); RELEASE_OUT.mkdir(parents=True,exist_ok=True)
    for d in (COVER_OUT,RELEASE_OUT):
        for f in d.iterdir():
            if f.is_file(): f.unlink()
    targets=json.loads(TARGETS.read_text(encoding='utf-8'))['items']
    items=[]; failures=[]
    for i,t in enumerate(targets,1):
        try:
            detail,pdfs,docs=resolve(t); s=slug(t['title'])
            local_pdf=RELEASE_OUT/f'{s}.pdf'; build_pdf(pdfs,local_pdf)
            local_docx=RELEASE_OUT/f'{s}.docx';
            if docs: dl(docs[0],local_docx)
            else: build_docx(local_pdf,local_docx)
            c=COVER_OUT/f'{s}.png'; cover(local_pdf,c)
            if local_pdf.stat().st_size<5000 or local_docx.stat().st_size<1000 or not c.exists(): raise RuntimeError('aset tidak valid')
            items.append({'title':t['title'],'author':t.get('author',''),'language':'ar','category':'tafsir','type':'tafsir-book','publish_year':detail.get('publish_year',''),'parts':detail.get('parts',len(pdfs)),'quranpedia_book_id':detail.get('id'),'source_page':f'https://quranpedia.net/book/{detail.get("id")}', 'pdf_url':f'https://github.com/pcmsomagede/pcmsomagede.github.io/releases/download/tafsirmu-latest/{s}.pdf','docx_url':f'https://github.com/pcmsomagede/pcmsomagede.github.io/releases/download/tafsirmu-latest/{s}.docx','cover_url':f'/media/tafsir-covers/{s}.png'})
            print('OK',i,t['title'])
        except Exception as e:
            failures.append({'title':t['title'],'error':str(e)}); print('FAIL',i,t['title'],e)
    if failures or len(items)!=40:
        raise SystemExit(f'FAILED: {len(items)}/40')
    MANIFEST.write_text(json.dumps({'generated':'2026-08-28','total':40,'items':items},ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__': main()
