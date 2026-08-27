#!/usr/bin/env python3
# PustakaMu catalog builder: crawl official Muhammadiyah/Tarjih document indexes, preserve real source URLs, cache covers, generate DOCX derivatives when possible.
import json, os, re, tempfile, time
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

SEEDS=[
 'https://tarjih.or.id/category/gallery/download-file/','https://tarjih.or.id/category/gallery/','https://tarjih.or.id/category/produk/','https://tarjih.or.id/category/produk/putusan/','https://tarjih.or.id/category/produk/wacana/','https://tarjih.or.id/category/produk/fatwa/',
 'https://muhammadiyah.or.id/download/','https://muhammadiyah.or.id/category/download/','https://muhammadiyah.or.id/category/publikasi/',
 'https://en.muhammadiyah.or.id/download/'
]
MANUAL=[
 ('Pedoman Hisab Muhammadiyah','Tarjih','https://tarjih.or.id/wp-content/uploads/2020/08/pedoman_hisab_muhammadiyah.pdf'),
 ('Tuntunan Thaharah','Tarjih','https://tarjih.or.id/wp-content/uploads/2020/08/ebook-Tuntunan-Thaharah.pdf'),
 ('Kepribadian Muhammadiyah dan Matan Keyakinan dan Cita-Cita Hidup Muhammadiyah','Pedoman','https://ar.muhammadiyah.or.id/wp-content/uploads/2024/09/KEPRIBADIAN-MUHAMMADIYAH_3vers_ebook.pdf'),
 ('Risalah Islam Berkemajuan','Pedoman','https://muhammadiyah.or.id/wp-content/uploads/2024/06/RIB-_versi-Indonesia.pdf')
]
ALLOWED=('tarjih.or.id','muhammadiyah.or.id','en.muhammadiyah.or.id','ar.muhammadiyah.or.id')
EXTS=('.pdf','.docx','.doc','.ppt','.pptx','.xls','.xlsx')
CLOUD=os.environ.get('CLOUDINARY_CLOUD_NAME','v6hqki7m');PRESET=os.environ.get('CLOUDINARY_UPLOAD_PRESET','pcmsomagede_document');OUT='data/pustaka-catalog.json'
MAX_PAGES=int(os.environ.get('PUSTAKA_MAX_PAGES','1000'));MAX_ITEMS=int(os.environ.get('PUSTAKA_MAX_ITEMS','100000'))
S=requests.Session();S.headers['User-Agent']='PCM-Somagede-Pustaka-Builder/5.0'
def clean(u,base): return urljoin(base,u.split('#')[0].strip()) if u else ''
def norm(s): return re.sub(r'[^a-z0-9]+','',str(s).lower())
def slug(s): return re.sub(r'[^a-z0-9]+','-',str(s).lower()).strip('-')[:90] or 'item'
def hostok(u): return urlparse(u).hostname and any(urlparse(u).hostname==h or urlparse(u).hostname.endswith('.'+h) for h in ALLOWED)
def cat(text):
 s=text.lower()
 for k,v in [('khutbah','Khutbah'),('kultum','Kultum'),('hadits','HaditsMu'),('tafsir','Tafsir'),('tarjih','Tarjih'),('fatwa','Tarjih'),('putusan','Tarjih'),('wacana','Referensi'),('pedoman','Pedoman'),('ramadhan','Ramadhan'),('booklet','Booklet'),('kader','Kaderisasi'),('ibadah','Ibadah'),('sejarah','Sejarah'),('dakwah','Dakwah')]:
  if k in s:return v
 return 'Referensi'
def title_from_post(soup):
 for sel in ['h1.entry-title','h1.post-title','h2.entry-title','article h1','article h2','h1']:
  e=soup.select_one(sel)
  if e and e.get_text(' ',strip=True): return re.sub(r'\s+',' ',e.get_text(' ',strip=True))[:220]
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
 posts=[];seen_pages=set();seen_posts=set();queue=list(SEEDS)
 for title,category,url in MANUAL: posts.append((url,title,category,url))
 while queue and len(seen_pages)<MAX_PAGES and len(posts)<MAX_ITEMS:
  page=queue.pop(0)
  if page in seen_pages:continue
  seen_pages.add(page)
  try:r=S.get(page,timeout=60);r.raise_for_status()
  except Exception:continue
  soup=BeautifulSoup(r.text,'html.parser')
  for a in soup.select('article h1 a,article h2 a,article h3 a,.entry-title a,.post-title a,a[href]'):
   u=clean(a.get('href'),page)
   if not u or not hostok(u) or u in seen_posts:continue
   if urlparse(u).path.lower().endswith(EXTS):
    t=a.get_text(' ',strip=True) or u;posts.append((u,t,cat(t+' '+u),page));seen_posts.add(u)
    if len(posts)>=MAX_ITEMS:break
   elif any(x in u for x in ['/category/','/download','/page/','/202','/book/','/produk/']):
    if u not in seen_pages and len(queue)<MAX_PAGES:queue.append(u)
  for a in soup.select('a.next.page-numbers,a.next,link[rel="next"],a[href*="/page/"]'):
   nu=clean(a.get('href'),page)
   if nu and hostok(nu) and nu not in seen_pages:queue.append(nu)
 return posts
def extract(posts):
 groups={}
 for url,fallback,forced_cat,source_page in posts:
  path=urlparse(url).path.lower()
  if path.endswith(EXTS):
   title=re.sub(r'\.(pdf|docx?|pptx?|xlsx?)$','',fallback,flags=re.I) or fallback
   key=norm(title);g=groups.setdefault(key,{'title':title,'category':forced_cat,'source_page':source_page or url})
   if path.endswith('.pdf'):g['pdf_source']=url
   elif path.endswith('.docx'):g['docx_source']=url
   continue
  try:r=S.get(url,timeout=60);r.raise_for_status()
  except Exception:continue
  soup=BeautifulSoup(r.text,'html.parser');title=title_from_post(soup) or fallback or url
  d=soup.select_one('time.entry-date,time.published,time.updated');date=(d.get('datetime') or d.get_text(' ',strip=True)) if d else ''
  direct=[]
  for a in soup.select('a[href],iframe[src],embed[src]'):
   h=clean(a.get('href') or a.get('src'),url)
   if hostok(h) and urlparse(h).path.lower().endswith(EXTS):direct.append(h)
  if not direct:continue
  key=norm(title);g=groups.setdefault(key,{'title':title,'category':cat(title+' '+url),'source_page':url,'date':date})
  if date:g['date']=date
  for h in direct:
   if urlparse(h).path.lower().endswith('.pdf'):g['pdf_source']=h
   elif urlparse(h).path.lower().endswith('.docx'):g['docx_source']=h
 return list(groups.values())
def number(title):
 m=re.search(r'(?:#|edisi\s+|nomor\s+)(\d+)',title.lower());return int(m.group(1)) if m else -1
def build():
 old={norm(x.get('title','')):x for x in json.load(open(OUT,encoding='utf-8')).get('items',[])} if os.path.exists(OUT) else {}
 groups=extract(crawl())
 for k,x in old.items():
  if k not in {norm(g['title']) for g in groups} and (x.get('pdf_url') or x.get('docx_url')):groups.append({'title':x.get('title'), 'category':x.get('category','Referensi'),'source_page':x.get('source_page',''),'date':x.get('date',''),'pdf_source':x.get('pdf_source',''),'docx_source':x.get('docx_source',''),'keep':True})
 out=[]
 with tempfile.TemporaryDirectory() as td:
  for n,g in enumerate(groups,1):
   title=g['title'];rec=dict(g);prior=old.get(norm(title),{});base='pustaka-'+slug(title)
   try:
    if g.get('pdf_source'):
     rec['pdf_url']=prior.get('pdf_url') or g['pdf_source']
     if not prior.get('pdf_url'):
      try:
       rr=upload(g['pdf_source'],title,'image',base);rec['pdf_url']=rr.get('secure_url') or rr.get('url') or g['pdf_source']
      except Exception: pass
     rec['cover_url']=re.sub(r'\.pdf(?=($|[?#]))','.jpg',rec['pdf_url'],flags=re.I);rec['status']='ready'
    if g.get('docx_source'):
     rec['docx_url']=prior.get('docx_url') or g['docx_source']
     if not prior.get('docx_url'):
      try:
       rr=upload(g['docx_source'],title,'raw',base+'.docx');rec['docx_url']=rr.get('secure_url') or rr.get('url') or g['docx_source']
      except Exception:pass
    elif g.get('pdf_source') and not prior.get('docx_url') and os.environ.get('PUSTAKA_GENERATE_DOCX','1')=='1':
     dp=os.path.join(td,f'{n}.pdf');xp=os.path.join(td,f'{n}.docx')
     try:
      download(g['pdf_source'],dp);from pdf2docx import Converter;cv=Converter(dp);cv.convert(xp);cv.close();rr=upload(xp,title,'raw',base+'.docx');rec['docx_url']=rr.get('secure_url') or rr.get('url');rec['docx_generated']=bool(rec.get('docx_url'))
     except Exception as e:rec['docx_status']='pending';rec['docx_error']=str(e)[:240]
   except Exception as e:rec['status']='ready' if rec.get('pdf_url') or rec.get('docx_url') else 'pending';rec['error']=str(e)[:240]
   if rec.get('pdf_url') or rec.get('docx_url'):out.append(rec)
 out.sort(key=lambda x:(0 if x.get('category')=='Tarjih' else 1,-number(x.get('title','')),-int(re.search(r'20\d{2}',x.get('date','') or '').group(0)) if re.search(r'20\d{2}',x.get('date','') or '') else 0,x.get('title','')))
 json.dump({'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(out),'items':out},open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
if __name__=='__main__':build()
