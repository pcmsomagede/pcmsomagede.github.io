#!/usr/bin/env python3
import json, os, re, tempfile, time
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

PAGE='https://www.pcmcepu.com/p/pustaka-digital-download-naskah-khutbah.html'
CLOUD=os.environ.get('CLOUDINARY_CLOUD_NAME','v6hqki7m')
PRESET=os.environ.get('CLOUDINARY_UPLOAD_PRESET','pcmsomagede_document')
OUT='data/pustaka-catalog.json'
LIMIT=int(os.environ.get('PUSTAKA_MAX_ITEMS','1000'))
S=requests.Session(); S.headers['User-Agent']='PCM-Somagede-Pustaka-Builder/2.0'
GENERIC={'lihat pdf','lihat docx','pdf','docx','download','unduh','baca','lihat','open','read'}
EXTS=('.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx')

def clean(u):
    if not u:return None
    return urljoin(PAGE,u.split('#')[0].strip())

def slug(s):
    s=re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
    return s[:90] or 'item'

def norm(s):
    return re.sub(r'[^a-z0-9]+','',str(s).lower())

def title_for(a):
    text=' '.join(a.stripped_strings).strip()
    if text.lower() not in GENERIC and len(text)>3:return text[:180]
    for parent in list(a.parents)[:5]:
        candidate=' '.join(parent.stripped_strings).strip()
        candidate=re.sub(r'\s+',' ',candidate)
        if 8<len(candidate)<=180 and candidate.lower() not in GENERIC:
            candidate=re.sub(r'\b(lihat|download|unduh|pdf|docx|baca)\b','',candidate,flags=re.I).strip(' -|:')
            if candidate:return candidate[:180]
    stem=Path(urlparse(clean(a.get('href') or '')).path).stem.replace('_',' ').replace('-',' ')
    return stem[:180] or 'Dokumen PustakaMu'

def category(title,href):
    s=(title+' '+href).lower()
    for key,cat in [('khutbah','Khutbah'),('kultum','Kultum'),('tarjih','Tarjih'),('kader','Kaderisasi'),('tafsir','Tafsir'),('ramadhan','Ramadhan'),('booklet','Booklet'),('pedoman','Pedoman'),('dakwah','Dakwah'),('sejarah','Sejarah'),('ibadah','Ibadah'),('fikih','Fikih')]:
        if key in s:return cat
    return 'Referensi'

def upload(file_or_url,title,resource_type,public_id):
    endpoint=f'https://api.cloudinary.com/v1_1/{CLOUD}/{resource_type}/upload'
    with open(file_or_url,'rb') if os.path.isfile(str(file_or_url)) else tempfile.TemporaryFile() as f:
        if not os.path.isfile(str(file_or_url)):
            r=S.get(file_or_url,timeout=90); r.raise_for_status(); f.write(r.content); f.seek(0)
        r=S.post(endpoint,files={'file':f},data={'upload_preset':PRESET,'public_id':public_id,'tags':'pustaka_somagede','context':f'title={title}'},timeout=180)
    r.raise_for_status(); return r.json()

def download(url,path):
    with S.get(url,stream=True,timeout=90) as r:
        r.raise_for_status()
        with open(path,'wb') as f:
            for chunk in r.iter_content(1024*256):
                if chunk:f.write(chunk)

def main():
    html=S.get(PAGE,timeout=90); html.raise_for_status(); soup=BeautifulSoup(html.text,'html.parser')
    groups={}
    for a in soup.select('a[href]'):
        href=clean(a.get('href')); text=' '.join(a.stripped_strings)
        if not href:continue
        p=urlparse(href).path.lower()
        if not p.endswith(EXTS):continue
        title=title_for(a)
        key=norm(re.sub(r'\b(pdf|docx?|download|unduh|lihat)\b','',title,flags=re.I)) or norm(Path(p).stem)
        g=groups.setdefault(key,{'title':title,'category':category(title,href)})
        if p.endswith('.pdf'):g['pdf_source']=href
        elif p.endswith('.docx'):g['docx_source']=href
        elif not g.get('pdf_source') and not g.get('docx_source'):g['docx_source']=href
        if len(groups)>=LIMIT:break
    old={norm(x.get('title','')):x for x in json.load(open(OUT,encoding='utf-8')).get('items',[])} if os.path.exists(OUT) else {}
    out=[]
    with tempfile.TemporaryDirectory() as td:
        for n,g in enumerate(groups.values(),1):
            title=g['title']; rec=dict(g); prior=old.get(norm(title),{})
            rec.pop('title',None); rec['title']=title
            base='pustaka-'+slug(title)
            try:
                if g.get('pdf_source'):
                    if prior.get('cloudinary_pdf_url'):
                        rec['pdf_url']=prior['cloudinary_pdf_url']
                    else:
                        r=upload(g['pdf_source'],title,'image',base)
                        rec['pdf_url']=r.get('secure_url') or r.get('url')
                    rec['cloudinary_url']=rec.get('pdf_url')
                    rec['status']='ready'
                    rec['cover_url']=rec['pdf_url'].replace('.pdf','.jpg') if rec.get('pdf_url') else ''
                if g.get('docx_source'):
                    if prior.get('cloudinary_docx_url'):
                        rec['docx_url']=prior['cloudinary_docx_url']
                    else:
                        r=upload(g['docx_source'],title,'raw',base+'.docx')
                        rec['docx_url']=r.get('secure_url') or r.get('url')
                elif rec.get('pdf_url') and os.environ.get('PUSTAKA_GENERATE_DOCX','1')=='1':
                    pdf_path=os.path.join(td,f'{n}.pdf'); docx_path=os.path.join(td,f'{n}.docx')
                    try:
                        download(rec['pdf_url'],pdf_path)
                        from pdf2docx import Converter
                        cv=Converter(pdf_path); cv.convert(docx_path); cv.close()
                        r=upload(docx_path,title,'raw',base+'.docx')
                        rec['docx_url']=r.get('secure_url') or r.get('url')
                        rec['docx_generated']=True
                    except Exception as e:
                        rec['docx_status']='pending'; rec['docx_error']=str(e)[:240]
            except Exception as e:
                rec['status']='pending'; rec['error']=str(e)[:240]
            out.append(rec); print(f'{n}/{len(groups)} {rec.get("status","pending")}: {title}')
    json.dump({'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(out),'items':out},open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
if __name__=='__main__':main()
