import json, re, shutil, subprocess, tempfile, unicodedata, time, html as htmlmod
from pathlib import Path
from urllib.parse import quote, urljoin
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; COVER_OUT=ROOT/'media'/'tafsir-covers'; RELEASE_OUT=ROOT/'build'/'tafsirmu-release'
TARGETS=DATA/'tafsir-40-targets.json'; MANIFEST=DATA/'tafsir-assets.json'
API='https://api.quranpedia.net/v1'; TIMEOUT=120
H={'User-Agent':'PustakaMu-TafsirMu/4.2'}


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
    return j if isinstance(j,list) else []


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
            if q and q==n: s=max(s,weight+6)
            elif q and (q in n or n in q): s=max(s,weight)
            elif q: s += sum(2 for z in re.findall(r'[a-z0-9\u0600-\u06ff]{4,}',q) if z in n)
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
        if u: at.append({'url':u,'name':str(a.get('name','')),'part':int(a.get('part',1) or 1)})
    return detail, at


def run(cmd): subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)


def fetch_binary(url):
    r=requests.get(url,headers=H,timeout=TIMEOUT,stream=True,allow_redirects=True)
    r.raise_for_status()
    ctype=r.headers.get('content-type','').lower()
    data=bytearray()
    for chunk in r.iter_content(1024*1024):
        if chunk:
            data.extend(chunk)
            if len(data)>=32: break
    head=bytes(data[:32])
    return r, ctype, head


def download(url,dst,kind=None):
    r=requests.get(url,headers=H,timeout=TIMEOUT,stream=True,allow_redirects=True)
    r.raise_for_status()
    ctype=r.headers.get('content-type','').lower()
    first=bytearray()
    with dst.open('wb') as f:
        for c in r.iter_content(1024*1024):
            if not c: continue
            if len(first)<64: first.extend(c[:64-len(first)])
            f.write(c)
    magic=bytes(first[:8])
    if b'%PDF' in magic or 'application/pdf' in ctype or str(dst).lower().endswith('.pdf'):
        return 'pdf'
    if 'wordprocessingml.document' in ctype or zip_is_docx(dst): return 'docx'
    if 'html' in ctype: raise RuntimeError('URL mengembalikan HTML, bukan dokumen')
    return kind or 'binary'


def zip_is_docx(path):
    try:
        import zipfile
        if not zipfile.is_zipfile(path): return False
        with zipfile.ZipFile(path) as z: return 'word/document.xml' in z.namelist()
    except Exception: return False


def attachment_pdfs(attachments):
    ordered=[]
    for a in attachments:
        n=(a.get('name') or '').lower(); u=a['url'].lower()
        score=0
        if '.pdf' in u or 'pdf' in n: score+=3
        if 'part' in n or 'جزء' in n: score+=1
        ordered.append((-score,a))
    return [a for _,a in sorted(ordered,key=lambda z:(z[0],z[1]['part'],z[1]['url']))]


def materialize_pdf(attachments,out,tmp):
    candidates=[]
    for i,a in enumerate(attachment_pdfs(attachments),1):
        f=tmp/f'att-{i:03d}'
        try:
            kind=download(a['url'],f)
            if kind=='pdf' and f.stat().st_size>5000:
                candidates.append((a['part'],f))
        except Exception:
            continue
    if not candidates: raise RuntimeError('tidak ditemukan lampiran PDF yang dapat dibaca')
    candidates.sort(key=lambda z:z[0])
    if len(candidates)==1: shutil.copy2(candidates[0][1],out)
    else: run(['pdfunite',*[str(f) for _,f in candidates],str(out)])


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


def cover(pdf,out): run(['pdftoppm','-f','1','-singlefile','-png','-r','180',str(pdf),str(out.with_suffix(''))])


def main():
    COVER_OUT.mkdir(parents=True,exist_ok=True); RELEASE_OUT.mkdir(parents=True,exist_ok=True)
    for d in (COVER_OUT,RELEASE_OUT):
        for f in d.iterdir():
            if f.is_file(): f.unlink()
    targets=json.loads(TARGETS.read_text(encoding='utf-8'))['items']
    items=[]; failures=[]
    for i,t in enumerate(targets,1):
        try:
            detail,attachments=resolve(t)
            s=slug(t['title'])
            with tempfile.TemporaryDirectory() as td:
                tmp=Path(td); local_pdf=RELEASE_OUT/f'{s}.pdf'; local_docx=RELEASE_OUT/f'{s}.docx'; local_cover=COVER_OUT/f'{s}.png'
                materialize_pdf(attachments,local_pdf,tmp)
                build_docx(local_pdf,local_docx); cover(local_pdf,local_cover)
                if min(local_pdf.stat().st_size,local_docx.stat().st_size,local_cover.stat().st_size)<1000: raise RuntimeError('asset tidak valid')
            items.append({'title':t['title'],'author':t.get('author',''),'language':detail.get('language',{}).get('code','ar') if isinstance(detail.get('language'),dict) else 'ar','category':'tafsir','type':'tafsir-book','publish_year':detail.get('publish_year',''),'parts':detail.get('parts',1),'quranpedia_book_id':detail.get('id'),'source_page':f'https://quranpedia.net/book/{detail.get("id")}','pdf_url':f'https://github.com/pcmsomagede/pcmsomagede.github.io/releases/download/tafsirmu-latest/{s}.pdf','docx_url':f'https://github.com/pcmsomagede/pcmsomagede.github.io/releases/download/tafsirmu-latest/{s}.docx','cover_url':f'/media/tafsir-covers/{s}.png'})
            print('OK',i,t['title'])
        except Exception as e:
            failures.append({'title':t['title'],'error':str(e)}); print('FAIL',i,t['title'],e)
    if failures or len(items)!=40:
        MANIFEST.write_text(json.dumps({'generated':'2026-08-28','total':len(items),'required':40,'items':items,'failures':failures},ensure_ascii=False,indent=2),encoding='utf-8')
        raise SystemExit(f'TafsirMu build incomplete: {len(items)}/40')
    MANIFEST.write_text(json.dumps({'generated':'2026-08-28','total':40,'required':40,'items':items,'failures':[]},ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__': main()
