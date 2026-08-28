import json, re, os, subprocess, tempfile, unicodedata, shutil, time, html as htmlmod
from pathlib import Path
from urllib.parse import quote, urljoin
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; OUT=ROOT/'media'/'tafsir'
TARGETS=DATA/'tafsir-40-targets.json'
MANIFEST=DATA/'tafsir-assets.json'
API='https://api.quranpedia.net/v1'
TIMEOUT=90
HEADERS={'User-Agent':'PustakaMu-TafsirMu/4.0 (PCM Somagede)'}


def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-') or 'tafsir'


def get_json(url, tries=4):
    last=None
    for attempt in range(tries):
        try:
            r=requests.get(url,headers=HEADERS,timeout=TIMEOUT)
            r.raise_for_status(); return r.json()
        except Exception as e:
            last=e
            if attempt+1<tries: time.sleep(1.25*(attempt+1))
    raise last


def book_items(data):
    if isinstance(data,dict):
        if isinstance(data.get('items'),list): return data['items']
        b=data.get('books')
        if isinstance(b,dict) and isinstance(b.get('items'),list): return b['items']
    return data if isinstance(data,list) else []


def norm(s):
    return re.sub(r'[^a-z0-9\u0600-\u06ff]+','',str(s).lower())


def pick_book(items,target):
    q=norm(target.get('query','')); a=norm(target.get('author',''))
    best=[]
    for x in items or []:
        info=x.get('book_info') if isinstance(x.get('book_info'),dict) else x
        name=norm(info.get('name','')); auth=norm(info.get('author','')); typ=norm(info.get('type','')); cat=norm(info.get('category',''))
        score=0
        if q and (q in name or name in q): score+=10
        qtokens=[z for z in re.split(r'\s+',q) if len(z)>=4]
        score+=sum(2 for z in qtokens if z in name)
        if a and (a in auth or auth in a): score+=6
        if 'tafsir' in typ or 'tafsir' in cat or 'تفسير' in str(info.get('category','')): score+=4
        if info.get('parts'): score+=1
        if info.get('contents_url'): score+=1
        best.append((score,info))
    best.sort(key=lambda z:z[0],reverse=True)
    return best[0][1] if best and best[0][0]>=5 else None


def fetch_detail(target):
    q=quote(target['query'],safe='')
    data=get_json(f'{API}/search/{q}/books')
    items=book_items(data)
    book=pick_book(items,target)
    if not book:
        raise RuntimeError('kitab tidak ditemukan pada indeks kitab tafsir')
    detail=get_json(f'{API}/book/{book["id"]}')
    typ=str(detail.get('type','')).lower()
    cat=detail.get('category') or {}
    catname=str(cat.get('name','') if isinstance(cat,dict) else cat).lower()
    if typ!='tafsir' and 'tafsir' not in catname and 'تفسير' not in catname:
        raise RuntimeError('hasil bukan kitab tafsir')
    attachments=[]
    for a in detail.get('book_attachments') or []:
        u=str(a.get('url','')).strip()
        if not u: continue
        u=urljoin(API+'/',u)
        low=u.lower().split('?')[0]
        if low.endswith(('.pdf','.docx','.doc')): attachments.append({'url':u,'name':a.get('name',''),'part':a.get('part',1)})
    pdfs=sorted({x['url'] for x in attachments if x['url'].lower().split('?')[0].endswith('.pdf')})
    docs=sorted({x['url'] for x in attachments if x['url'].lower().split('?')[0].endswith(('.docx','.doc'))})
    return detail,pdfs,docs


def download(url,path):
    r=requests.get(url,headers=HEADERS,timeout=TIMEOUT,stream=True,allow_redirects=True)
    r.raise_for_status()
    ctype=r.headers.get('content-type','').lower()
    if 'html' in ctype and not url.lower().split('?')[0].endswith(('.html','.htm')):
        raise RuntimeError('unduhan bukan dokumen')
    with path.open('wb') as f:
        for chunk in r.iter_content(1024*1024):
            if chunk: f.write(chunk)


def run(cmd): subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)


def combine_pdfs(urls,out):
    with tempfile.TemporaryDirectory() as td:
        p=Path(td); files=[]
        for i,u in enumerate(urls,1):
            f=p/f'{i:03d}.pdf'; download(u,f); files.append(f)
        if not files: raise RuntimeError('PDF kosong')
        if len(files)==1: shutil.copy2(files[0],out)
        else: run(['pdfunite',*map(str,files),str(out)])


def flatten_text(obj):
    out=[]
    if isinstance(obj,str):
        s=re.sub(r'<[^>]+>',' ',obj)
        s=htmlmod.unescape(s).strip()
        if s: out.append(s)
    elif isinstance(obj,list):
        for v in obj: out.extend(flatten_text(v))
    elif isinstance(obj,dict):
        for key in ('text','content','translation','tafsir','body','paragraph','value'):
            if key in obj: out.extend(flatten_text(obj[key]))
        if not out:
            for v in obj.values(): out.extend(flatten_text(v))
    return out


def build_from_contents(detail,target,pdf_out,docx_out,cover_out):
    cu=detail.get('contents_url')
    if not cu: raise RuntimeError('konten kitab tidak tersedia')
    data=get_json(cu)
    lines=flatten_text(data)
    if len(lines)<20: raise RuntimeError('konten kitab terlalu sedikit')
    # Keep source order while removing immediate duplicates.
    cleaned=[]
    prev=None
    for line in lines:
        if line==prev: continue
        cleaned.append(line); prev=line
    lines=cleaned
    with tempfile.TemporaryDirectory() as td:
        t=Path(td)
        body=''.join(f'<p dir="rtl" lang="ar">{htmlmod.escape(line)}</p>' for line in lines)
        title=htmlmod.escape(target['title']); author=htmlmod.escape(target.get('author',''))
        doc_html=f'''<!doctype html><html><head><meta charset="utf-8"><style>@page{{size:A4;margin:18mm}}body{{font-family:"Noto Naskh Arabic","Noto Sans Arabic","DejaVu Sans",sans-serif;line-height:1.8;font-size:13pt}}h1{{font-size:24pt;text-align:center;margin-top:70mm}}h2{{font-size:13pt;text-align:center;font-weight:normal}}p{{margin:0 0 8pt;text-align:right}}.cover{{page-break-after:always;height:250mm;display:flex;flex-direction:column;justify-content:center;align-items:center}}</style></head><body><div class="cover"><h1>{title}</h1><h2>{author}</h2><h2>نص الكتاب الكامل</h2></div>{body}</body></html>'''
        h=t/'book.html'; h.write_text(doc_html,encoding='utf-8')
        # LibreOffice preserves RTL/Arabic shaping when converting HTML to PDF/DOCX.
        run(['libreoffice','--headless','--convert-to','pdf','--outdir',str(t),str(h)])
        generated=t/'book.pdf'
        if not generated.exists(): raise RuntimeError('PDF generation failed')
        shutil.copy2(generated,pdf_out)
        run(['pdftoppm','-f','1','-singlefile','-png','-r','150',str(pdf_out),str(cover_out.with_suffix(''))])
        run(['libreoffice','--headless','--convert-to','docx','--outdir',str(t),str(h)])
        generated_docx=t/'book.docx'
        if not generated_docx.exists(): raise RuntimeError('DOCX generation failed')
        shutil.copy2(generated_docx,docx_out)


def make_docx_from_pdf(pdf,out):
    with tempfile.TemporaryDirectory() as td:
        t=Path(td)
        try:
            run(['libreoffice','--headless','--convert-to','docx','--outdir',str(t),str(pdf)])
            made=t/(pdf.stem+'.docx')
            if made.exists() and made.stat().st_size>1000:
                shutil.copy2(made,out); return
        except Exception: pass
        text=t/(pdf.stem+'.txt'); run(['pdftotext','-layout',str(pdf),str(text)])
        from docx import Document
        from docx.shared import Pt
        d=Document(); d.styles['Normal'].font.name='Noto Sans'; d.styles['Normal'].font.size=Pt(10)
        for line in text.read_text(errors='ignore').splitlines(): d.add_paragraph(line)
        d.save(out)


def make_cover(pdf,out): run(['pdftoppm','-f','1','-singlefile','-png','-r','150',str(pdf),str(out.with_suffix(''))])


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    targets=json.loads(TARGETS.read_text(encoding='utf-8'))['items']
    results=[]; failures=[]
    # Never wipe a previously successful build until the replacement is ready.
    stage=OUT.with_name('tafsir-build-stage')
    if stage.exists(): shutil.rmtree(stage)
    stage.mkdir(parents=True,exist_ok=True)
    for idx,target in enumerate(targets,1):
        try:
            detail,pdfs,docs=fetch_detail(target)
            s=slug(target['title'])
            pdf_local=stage/f'{s}.pdf'; docx_local=stage/f'{s}.docx'; cover_local=stage/f'{s}.png'
            if pdfs:
                combine_pdfs(pdfs,pdf_local)
                if docs:
                    download(docs[0],docx_local)
                else:
                    make_docx_from_pdf(pdf_local,docx_local)
                make_cover(pdf_local,cover_local)
                mode='source-pdf'
            else:
                build_from_contents(detail,target,pdf_local,docx_local,cover_local)
                mode='reconstructed-from-book-content'
            if min(pdf_local.stat().st_size,docx_local.stat().st_size,cover_local.stat().st_size)<1000: raise RuntimeError('asset tidak valid')
            results.append({'title':target['title'],'author':target.get('author',''),'language':detail.get('language',{}).get('code','ar') if isinstance(detail.get('language'),dict) else 'ar','category':'tafsir','type':'tafsir-book','quranpedia_book_id':detail.get('id'),'publish_year':detail.get('publish_year',''),'parts':detail.get('parts',1),'source_page':f'https://quranpedia.net/book/{detail.get("id")}','pdf_url':f'/media/tafsir/{s}.pdf','docx_url':f'/media/tafsir/{s}.docx','cover_url':f'/media/tafsir/{s}.png','build_mode':mode})
            print('OK',idx,target['title'],mode)
        except Exception as e:
            failures.append({'title':target['title'],'error':str(e)})
            print('FAIL',idx,target['title'],e)
    if failures or len(results)!=40:
        raise SystemExit(f'TafsirMu build incomplete: {len(results)}/40')
    if OUT.exists():
        for p in OUT.iterdir():
            if p.is_file(): p.unlink()
    for p in stage.iterdir(): shutil.move(str(p),OUT/p.name)
    stage.rmdir()
    MANIFEST.write_text(json.dumps({'generated':'2026-08-28','total':40,'required':40,'items':results,'failures':[]},ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__': main()
