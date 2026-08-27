#!/usr/bin/env python3
import json,re,time,os,io
from pathlib import Path
from urllib.parse import urljoin,urlparse
import requests
from bs4 import BeautifulSoup
try:
 import fitz
except Exception:
 fitz=None

OUT='data/pustaka-catalog.json'
MAX_ITEMS=int(os.getenv('PUSTAKA_MAX_ITEMS','1000000'))
PER_PAGE=100
HEADERS={'User-Agent':'PCM-Somagede-Pustaka/6.1 (+https://pcmsomagede.github.io/)'}
S=requests.Session();S.headers.update(HEADERS)

SOURCES={
 'muhammadiyah':['https://muhammadiyah.or.id','https://tarjih.or.id','https://suaramuhammadiyah.id','https://buku.muhammadiyah.or.id'],
 'kemenag':['https://kemenag.go.id','https://quran.kemenag.go.id'],
 'salafi':['https://yufid.com','https://rodja.com','https://rodja.tv','https://muslimafiyah.com','https://raehanulbahrain.com'],
 'nu':['https://nu.or.id']
}
ALLOWED_HOSTS=tuple(sorted({urlparse(x).hostname for xs in SOURCES.values() for x in xs if urlparse(x).hostname}))
NOISE=re.compile(r'computer|programming|python|astronomy|physics|chemistry|mathematics|business|marketing|finance|engineering|medicine|biology|travel|cooking|recipe|novel|romance|crime|fiction|patrice|lucas|widner|rogers|monge|washington',re.I)
KH=re.compile(r'khutbah|khutba|jumat|jum\s*[\'’]?at|jumah|idul\s+(fitri|adha)|gerhana|istisqa',re.I)
KU=re.compile(r'kultum|kuliah\s+tujuh\s+menit|7\s*menit|ceramah\s+(singkat|pendek)|narasi\s+dakwah\s+pendek|pidato\s+agama',re.I)
TF=re.compile(r'tafsir|tafs?ir|tanzil|ta.wil|qur.?an\s+commentary',re.I)
HD=re.compile(r'hadits?|hadith|shahih\s+bukhari|shahih\s+muslim|sunan\s+abu|abu\s+dawud|tirmidzi|tirmidhi|nasai|nasa.i|ibnu\s+majah|ibn\s+majah|riyad|bulugh',re.I)
ISLAM=re.compile(r'islam|muslim|qur.?an|hadis|hadith|tafsir|fiqih|fikih|aqidah|akidah|tauhid|sunnah|syariah|dakwah|khutbah|jumat|kultum|ceramah|pengajian|pesantren|kitab|sholat|shalat|zakat|puasa|haji|umrah|ramadhan|ulama|ustadz|doa|ibadah|akhlak|tasawuf|nahwu|sharaf|ushul\s+fiqh|tarjih|muhammadiyah',re.I)

def host_ok(u):
 h=urlparse(u).hostname or ''
 return any(h==x or h.endswith('.'+x) for x in ALLOWED_HOSTS)

def txt(v):
 if isinstance(v,list):return ' '.join(map(str,v))
 return str(v or '')

def normalize(s):return re.sub(r'[^a-z0-9]+','',txt(s).lower())

def classify(t):
 if KH.search(t):return 'khutbah'
 if KU.search(t):return 'kultum'
 if TF.search(t):return 'tafsir'
 if HD.search(t):return 'hadits'
 return 'buku'

def lang(v):return 'id' if re.search(r'indonesia|indonesian|bahasa indonesia|\bid\b',txt(v).lower()) else 'other'

def year(v):
 m=re.search(r'(19|20)\d{2}',txt(v));return int(m.group()) if m else 0

def clean(base,u):return urljoin(base,txt(u).split('#')[0].strip()) if u else ''

def wp_posts(base,search,pages=4):
 out=[]
 for p in range(1,pages+1):
  try:
   r=S.get(base+'/wp-json/wp/v2/posts',params={'search':search,'per_page':PER_PAGE,'page':p,'_fields':'link,date,modified,title,content,excerpt'},timeout=45)
   if not r.ok:break
   rows=r.json();out.extend(rows)
   if len(rows)<PER_PAGE:break
  except Exception:break
 return out

def docs_from(base,html):
 s=BeautifulSoup(html,'html.parser');out=[]
 for a in s.select('a[href],iframe[src],embed[src],source[src]'):
  u=clean(base,a.get('href') or a.get('src'))
  if host_ok(u) and re.search(r'\.(pdf|docx?)($|\?)',urlparse(u).path,re.I):out.append(u)
 return out

def post_record(group,p):
 t=BeautifulSoup(txt(p.get('title',{}).get('rendered') if isinstance(p.get('title'),dict) else p.get('title')),'html.parser').get_text(' ',strip=True)
 html=txt(p.get('content',{}).get('rendered') if isinstance(p.get('content'),dict) else p.get('content'))
 link=txt(p.get('link')); c=classify(t+' '+html+' '+link)
 ds=docs_from(link or SOURCES[group][0],html)
 return {'title':t,'category':c,'source_page':link,'date':p.get('date') or p.get('modified') or '','pdf_source':next((u for u in ds if re.search(r'\.pdf($|\?)',u,re.I)),''),'docx_source':next((u for u in ds if re.search(r'\.docx?($|\?)',u,re.I)),''),'source_group':group}

def crawl():
 rec=[]
 terms={'muhammadiyah':['Himpunan Putusan Tarjih','Tanya Jawab Agama','pedoman','tarjih','dakwah','tafsir','khutbah','kultum','ibadah','keislaman'],'kemenag':['tafsir','quran','Islam','khutbah','ceramah'],'salafi':['tafsir','khutbah','kultum','ceramah','kitab','Islam'],'nu':['khutbah','tafsir','ceramah','kitab','Islam']}
 for group,bases in SOURCES.items():
  if group=='muhammadiyah': bases=[x for x in bases if 'buku.' not in x]
  for base in bases:
   for term in terms[group]:
    for p in wp_posts(base,term,pages=3):
     try:rec.append(post_record(group,p))
     except Exception:pass
 return rec

def direct_pdfs():
 roots=['https://tarjih.or.id/category/gallery/download-file/','https://tarjih.or.id/category/produk/putusan/','https://tarjih.or.id/category/produk/wacana/','https://tarjih.or.id/category/produk/fatwa/','https://muhammadiyah.or.id/download/','https://muhammadiyah.or.id/category/publikasi/']
 out=[]
 for root in roots:
  try:
   s=BeautifulSoup(S.get(root,timeout=45).text,'html.parser')
   for a in s.select('a[href]'):
    u=clean(root,a.get('href'))
    if host_ok(u) and re.search(r'\.pdf$',urlparse(u).path,re.I):
     t=a.get_text(' ',strip=True) or re.sub(r'\.pdf$','',u.rsplit('/',1)[-1],flags=re.I);out.append({'title':t,'category':classify(t),'source_page':root,'pdf_source':u,'source_group':'muhammadiyah'})
  except Exception:pass
 return out

def make_cover(pdf_url,title):
 if not fitz or not pdf_url:return ''
 safe=re.sub(r'[^a-z0-9]+','-',title.lower()).strip('-')[:90] or 'item'
 path=Path('assets/pustaka-covers')/(safe+'.jpg');path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists():return '/assets/pustaka-covers/'+path.name
 try:
  r=S.get(pdf_url,timeout=90);r.raise_for_status()
  doc=fitz.open(stream=r.content,filetype='pdf');page=doc.load_page(0);pix=page.get_pixmap(matrix=fitz.Matrix(1.35,1.35),alpha=False);pix.save(str(path),output='jpg');doc.close();return '/assets/pustaka-covers/'+path.name
 except Exception:return ''

def merge(rows):
 old={normalize(x.get('title')):x for x in json.load(open(OUT,encoding='utf-8')).get('items',[])} if os.path.exists(OUT) else {}
 m={}
 for r in rows:
  title=txt(r.get('title')).strip()
  if not title:continue
  blob=txt(r)
  if NOISE.search(title) and not ISLAM.search(blob):continue
  k=normalize(title);prev=m.get(k) or old.get(k)
  if prev:
   rr=dict(prev);rr.update({a:b for a,b in r.items() if b});m[k]=rr
  else:m[k]=r
 out=[]
 for r in m.values():
  if not (r.get('pdf_source') or r.get('docx_source') or r.get('pdf_url') or r.get('docx_url')):continue
  r['category']=r.get('category') or classify(txt(r.get('title')))
  if r.get('category') in ('hadits',):continue
  if r.get('pdf_source') and not r.get('cover_url'):
   c=make_cover(r['pdf_source'],r['title'])
   if c:r['cover_url']=c
  out.append(r)
 def sk(r):
  g=r.get('source_group','lain');sr={'muhammadiyah':1000,'kemenag':850,'salafi':700,'nu':500,'lain':100}.get(g,100)
  c={'khutbah':4,'kultum':3,'buku':2,'tafsir':1}.get(r.get('category'),0)
  return (0 if lang(r.get('language'))=='id' else 1,-sr,-c,-year(r.get('date') or r.get('year')),txt(r.get('title')).lower())
 out.sort(key=sk)
 return out[:MAX_ITEMS]

def build():
 items=merge(direct_pdfs()+crawl())
 json.dump({'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(items),'items':items},open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
 print('PustakaMu v2 records:',len(items))
if __name__=='__main__':build()
