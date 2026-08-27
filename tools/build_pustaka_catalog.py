#!/usr/bin/env python3
# PustakaMu catalog builder v3: crawl paginated Muhammadiyah/Tarjih indexes, group formats, cache covers, create DOCX derivatives.
import json, os, re, tempfile, time
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

SEEDS=[
 'https://tarjih.or.id/category/gallery/download-file/',
 'https://tarjih.or.id/category/gallery/',
 'https://tarjih.or.id/category/produk/',
 'https://tarjih.or.id/category/produk/putusan/',
 'https://tarjih.or.id/category/produk/wacana/',
 'https://tarjih.or.id/category/produk/fatwa/'
]
CLOUD=os.environ.get('CLOUDINARY_CLOUD_NAME','v6hqki7m'); PRESET=os.environ.get('CLOUDINARY_UPLOAD_PRESET','pcmsomagede_document')
OUT='data/pustaka-catalog.json'; MAX_PAGES=int(os.environ.get('PUSTAKA_MAX_PAGES','250')); MAX_ITEMS=int(os.environ.get('PUSTAKA_MAX_ITEMS','10000'))
S=requests.Session(); S.headers['User-Agent']='PCM-Somagede-Pustaka-Builder/3.0'
EXTS=('.pdf','.docx','.doc','.ppt','.pptx','.xls','.xlsx'); GENERIC={'pdf','docx','doc','download','unduh','baca','lihat','read more','open'}

def clean(u,base):
    if not u:return ''
    return urljoin(base,u.split('#')[0].strip())

def norm(s):return re.sub(r'[^a-z0-9]+','',str(s).lower())
def slug(s):return re.sub(r'[^a-z0-9]+','-',str(s).lower()).strip('-')[:90] or 'item'

def cat(text):
    s=text.lower()
    for k,v in [('khutbah','Khutbah'),('kultum','Kultum'),('hadits','HaditsMu'),('tarjih','Tarjih'),('fatwa','Tarjih'),('putusan','Tarjih'),('wacana','Referensi'),('pedoman','Pedoman'),('ramadhan','Ramadhan'),('booklet','Booklet'),('tafsir','Tafsir'),('kader','Kaderisasi'),('ibadah','Ibadah'),('sejarah','Sejarah'),('dakwah','Dakwah')]:
        if k in s:return v
    return 'Referensi'

def title_from_post(soup):
    for sel in ['h1.entry-title','h1.post-title','h2.entry-title','article h1','article h2']:
        e=soup.select_one(sel)
        if e and e.get_text(' ',strip=True):return re.sub(r'\s+',' ',e.get_text(' ',strip=True))[:220]
    return ''

def upload(file_or_url,title,resource_type,public_id):
    endpoint=f'https://api.cloudinary.com/v1_1/{CLOUD}/{resource_type}/upload'
    if os.path.isfile(str(file_or_url)):
        with open(file_or_url,'rb') as f:r=S.post(endpoint,files={'file':f},data={'upload_preset':PRESET,'public_id':public_id,'tags':'pustaka_somagede','context':f'title={title}'},timeout=180)
    else:r=S.post(endpoint,data={'upload_preset':PRESET,'file':file_or_url,'public_id':public_id,'tags':'pustaka_somagede','context':f'title={title}'},timeout=180)
    r.raise_for_status();return r.json()

def download(url,path):
    with S.get(url,stream=True,timeout=90) as r:
        r.raise_for_status()
        with open(path,'wb') as f:
            for chunk in r.iter_content(262144):
                if chunk:f.write(chunk)

def crawl():
    posts=[]; seen_pages=set(); queue=list(SEEDS); seen_posts=set()
    while queue and len(seen_pages)<MAX_PAGES and len(posts)<MAX_ITEMS:
        page=queue.pop(0)
        if page in seen_pages:continue
        seen_pages.add(page)
        try:r=S.get(page,timeout=60);r.raise_for_status()
        except Exception:continue
        soup=BeautifulSoup(r.text,'html.parser')
        for a in soup.select('article h1 a,article h2 a,article h3 a,.entry-title a,.post-title a'):
            u=clean(a.get('href'),page)
            if not u or u in seen_posts or not u.startswith('https://tarjih.or.id/'):continue
            seen_posts.add(u);posts.append((u,a.get_text(' ',strip=True)))
            if len(posts)>=MAX_ITEMS:break
        nxt=soup.select_one('a.next.page-numbers,a.next,link[rel="next"]')
        if nxt:
            nu=clean(nxt.get('href'),page)
            if nu and nu not in seen_pages:queue.append(nu)
        for a in soup.select('a[href*="/page/"]'):
            nu=clean(a.get('href'),page)
            if nu and nu not in seen_pages and nu.startswith('https://tarjih.or.id/') and len(queue)<MAX_PAGES:queue.append(nu)
    return posts

def extract_posts(posts):
    groups={}
    for i,(url,fallback_title) in enumerate(posts,1):
        try:r=S.get(url,timeout=60);r.raise_for_status()
        except Exception:continue
        soup=BeautifulSoup(r.text,'html.parser');title=title_from_post(soup) or fallback_title or url
        links=[]
        for a in soup.select('a[href],iframe[src],embed[src]'):
            h=a.get('href') or a.get('src') or ''
            h=clean(h,url)
            p=urlparse(h).path.lower()
            if p.endswith(EXTS) or 'drive.google.com' in h or 'docs.google.com' in h:links.append(h)
        # Prefer direct office/PDF links; Google links are retained as source metadata but not forced into preview.
        direct=[h for h in links if urlparse(h).path.lower().endswith(EXTS)]
        if not direct:continue
        key=norm(title);g=groups.setdefault(key,{'title':title,'category':cat(title+' '+url),'source_page':url})
        for h in direct:
            p=urlparse(h).path.lower()
            if p.endswith('.pdf'):g['pdf_source']=h
            elif p.endswith('.docx'):g['docx_source']=h
        if i%50==0:print('posts scanned',i,'groups',len(groups))
    return list(groups.values())

def build():
    groups=extract_posts(crawl());old={norm(x.get('title','')):x for x in json.load(open(OUT,encoding='utf-8')).get('items',[])} if os.path.exists(OUT) else {};out=[]
    with tempfile.TemporaryDirectory() as td:
        for n,g in enumerate(groups,1):
            title=g['title'];rec=dict(g);prior=old.get(norm(title),{});base='pustaka-'+slug(title)
            try:
                if g.get('pdf_source'):
                    rec['pdf_url']=prior.get('pdf_url') or prior.get('cloudinary_pdf_url') or prior.get('cloudinary_url')
                    if not rec['pdf_url']:
                        rr=upload(g['pdf_source'],title,'image',base);rec['pdf_url']=rr.get('secure_url') or rr.get('url')
                    rec['cloudinary_url']=rec['pdf_url'];rec['cover_url']=re.sub(r'\.pdf(?=($|[?#]))','.jpg',rec['pdf_url'],flags=re.I);rec['status']='ready'
                if g.get('docx_source'):
                    rec['docx_url']=prior.get('docx_url') or prior.get('cloudinary_docx_url')
                    if not rec['docx_url']:
                        rr=upload(g['docx_source'],title,'raw',base+'.docx');rec['docx_url']=rr.get('secure_url') or rr.get('url')
                elif g.get('pdf_source') and os.environ.get('PUSTAKA_GENERATE_DOCX','1')=='1':
                    dp=os.path.join(td,f'{n}.pdf');xp=os.path.join(td,f'{n}.docx')
                    try:
                        # Convert from the original public source, not Cloudinary, because some Cloudinary PDF delivery URLs are protected.
                        download(g['pdf_source'],dp)
                        from pdf2docx import Converter
                        cv=Converter(dp);cv.convert(xp);cv.close();rr=upload(xp,title,'raw',base+'.docx');rec['docx_url']=rr.get('secure_url') or rr.get('url');rec['docx_generated']=True
                    except Exception as e:rec['docx_status']='pending';rec['docx_error']=str(e)[:240]
            except Exception as e:rec['status']='pending';rec['error']=str(e)[:240]
            out.append(rec)
            if n%25==0:print('assets',n,'of',len(groups))
    out.sort(key=lambda x:(0 if x.get('category')=='Tarjih' else 1,x.get('title','')),reverse=False)
    json.dump({'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(out),'items':out},open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
if __name__=='__main__':build()
