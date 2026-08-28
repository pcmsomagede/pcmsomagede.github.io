import json, re, os, subprocess, tempfile, unicodedata, shutil, time
from pathlib import Path
from urllib.parse import quote, urljoin
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; OUT=ROOT/'media'/'tafsir'
TARGETS=DATA/'tafsir-40-targets.json'
MANIFEST=DATA/'tafsir-assets.json'
API='https://api.quranpedia.net/v1'
TIMEOUT=90
HEADERS={'User-Agent':'PustakaMu-TafsirMu/3.0'}


def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-') or 'tafsir'


def get_json(url, tries=3):
    last=None
    for attempt in range(tries):
        try:
            r=requests.get(url,headers=HEADERS,timeout=TIMEOUT)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last=e
            if attempt+1<tries: time.sleep(1.5*(attempt+1))
    raise last


def book_items(data):
    if isinstance(data, dict):
        if isinstance(data.get('items'), list):
            return data['items']
        b=data.get('books')
        if isinstance(b, dict) and isinstance(b.get('items'), list):
            return b['items']
    return data if isinstance(data,list) else []


def pick_book(items, target):
    q=target['query'].lower(); author=target.get('author','').lower()
    scored=[]
    for x in items or []:
        info=x.get('book_info') if isinstance(x.get('book_info'),dict) else x
        name=str(info.get('name','')).lower(); a=str(info.get('author','')).lower()
        category=str(info.get('category','')).lower()
        score=(5 if q in name or name in q else 0)
        score+=(3 if author and (author in a or a in author) else 0)
        score+=(3 if 'tafsir' in str(info.get('type','')).lower() else 0)
        score+=(2 if 'تفسير' in category or 'tafsir' in category else 0)
        scored.append((score,info))
    scored.sort(key=lambda z:z[0],reverse=True)
    return scored[0][1] if scored and scored[0][0]>0 else None


def resolve(target):
    q=quote(target['query'],safe='')
    data=get_json(f'{API}/search/{q}/books')
    items=book_items(data)
    book=pick_book(items,target)
    if not book:
        raise RuntimeError('kitab tidak ditemukan')
    detail=get_json(f'{API}/book/{book["id"]}')
    typ=str(detail.get('type','')).lower()
    cat=detail.get('category') or {}
    catname=str(cat.get('name','') if isinstance(cat,dict) else cat).lower()
    if typ!='tafsir' and 'tafsir' not in catname and 'تفسير' not in catname:
        raise RuntimeError('hasil bukan kitab tafsir')
    at=[]
    for a in detail.get('book_attachments') or []:
        u=str(a.get('url','')).strip()
        if not u: continue
        u=urljoin(API+'/',u)
        low=u.lower().split('?')[0]
        if low.endswith(('.pdf','.docx','.doc')):
            at.append({'url':u,'name':a.get('name',''),'part':a.get('part',1)})
    pdfs=sorted({x['url'] for x in at if x['url'].lower().split('?')[0].endswith('.pdf')})
    docs=sorted({x['url'] for x in at if any(x['url'].lower().split('?')[0].endswith(ext) for ext in ('.docx','.doc'))})
    if not pdfs and not docs:
        raise RuntimeError('kitab tidak memiliki lampiran unduhan')
    return detail,pdfs,docs


def download(url,path):
    r=requests.get(url,headers=HEADERS,timeout=TIMEOUT,stream=True,allow_redirects=True)
    r.raise_for_status()
    ctype=r.headers.get('content-type','').lower()
    if 'html' in ctype:
        raise RuntimeError(f'unduhan mengembalikan HTML: {url}')
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


def make_docx(pdf,out):
    with tempfile.TemporaryDirectory() as td:
        t=Path(td)
        try:
            run(['libreoffice','--headless','--convert-to','docx','--outdir',str(t),str(pdf)])
            made=t/(pdf.stem+'.docx')
            if made.exists() and made.stat().st_size>1000:
                shutil.copy2(made,out); return
        except Exception:
            pass
        text=t/(pdf.stem+'.txt'); run(['pdftotext','-layout',str(pdf),str(text)])
        from docx import Document
        from docx.shared import Pt
        d=Document(); d.styles['Normal'].font.name='Noto Sans'; d.styles['Normal'].font.size=Pt(10)
        for line in text.read_text(errors='ignore').splitlines(): d.add_paragraph(line)
        d.save(out)


def make_cover(pdf,out):
    run(['pdftoppm','-f','1','-singlefile','-png','-r','150',str(pdf),str(out.with_suffix(''))])


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for f in OUT.iterdir():
        if f.is_file(): f.unlink()
    targets=json.loads(TARGETS.read_text(encoding='utf-8'))['items']
    results=[]; failures=[]
    for idx,target in enumerate(targets,1):
        try:
            detail,pdfs,docs=resolve(target)
            s=slug(target['title'])
            pdf_local=OUT/f'{s}.pdf'; combine_pdfs(pdfs,pdf_local)
            if pdf_local.stat().st_size<5000: raise RuntimeError('PDF terlalu kecil')
            cover=OUT/f'{s}.png'; make_cover(pdf_local,cover)
            docx=OUT/f'{s}.docx'
            if docs:
                download(docs[0],docx)
            else:
                make_docx(pdf_local,docx)
            if not docx.exists() or docx.stat().st_size<1000: raise RuntimeError('DOCX gagal dibuat')
            results.append({
                'title':target['title'],'author':target.get('author',''),'language':detail.get('language',{}).get('code','ar') if isinstance(detail.get('language'),dict) else 'ar',
                'category':'tafsir','type':'tafsir-book','quranpedia_book_id':detail.get('id'),
                'publish_year':detail.get('publish_year',''),'parts':detail.get('parts',len(pdfs)),
                'source_page':f'https://quranpedia.net/book/{detail.get("id")}',
                'pdf_url':f'/media/tafsir/{s}.pdf','docx_url':f'/media/tafsir/{s}.docx','cover_url':f'/media/tafsir/{s}.png',
                'pdf_source_urls':pdfs,'docx_source_urls':docs
            })
            print('OK',idx,target['title'])
        except Exception as e:
            failures.append({'title':target['title'],'error':str(e)})
            print('FAIL',idx,target['title'],e)
    MANIFEST.write_text(json.dumps({'generated':'2026-08-28','total':len(results),'required':40,'items':results,'failures':failures},ensure_ascii=False,indent=2),encoding='utf-8')
    if failures or len(results)!=40:
        raise SystemExit(f'TafsirMu incomplete: {len(results)}/40 verified')

if __name__=='__main__': main()
