#!/usr/bin/env python3
import json,re,time,os,io
from urllib.parse import urljoin,urlparse
import requests
from bs4 import BeautifulSoup

OUT='data/pustaka-catalog.json'
MAX_ITEMS=int(os.getenv('PUSTAKA_MAX_ITEMS','1000000'))
PER_PAGE=100
HEADERS={'User-Agent':'PCM-Somagede-Pustaka/6.0 (+https://pcmsomagede.github.io/)'}
S=requests.Session();S.headers.update(HEADERS)

SOURCES={
 'muhammadiyah':[
  'https://muhammadiyah.or.id',
  'https://tarjih.or.id',
  'https://suaramuhammadiyah.id',
  'https://buku.muhammadiyah.or.id'
 ],
 'kemenag':['https://kemenag.go.id','https://quran.kemenag.go.id'],
 'salafi':['https://yufid.com','https://rodja.com','https://rodja.tv','https://muslimafiyah.com','https://raehanulbahrain.com'],
 'nu':['https://nu.or.id'],
}
ALLOWED_HOSTS=tuple(sorted({urlparse(x).hostname for xs in SOURCES.values() for x in xs if urlparse(x).hostname}))
NOISE=re.compile(r'computer|programming|python|astronomy|physics|chemistry|mathematics|business|marketing|finance|engineering|medicine|biology|travel|cooking|recipe|novel|romance|crime|fiction',re.I)
KH=re.compile(r'khutbah|khutba|jumat|jum\s*[\'’]?at|jumah|idul\s+(fitri|adha)|gerhana|istisqa',re.I)
KU=re.compile(r'kultum|kuliah\s+tujuh\s+menit|7\s*menit|ceramah\s+(singkat|pendek)|narasi\s+dakwah\s+pendek|pidato\s+agama',re.I)
TF=re.compile(r'tafsir|tafs?ir|tanzil|ta.wil|qur.?an\s+commentary',re.I)
HD=re.compile(r'hadits?|hadith|shahih\s+bukhari|shahih\s+muslim|sunan\s+abu|abu\s+dawud|tirmidzi|tirmidhi|nasai|nasa.i|ibnu\s+majah|ibn\s+majah|riyad|bulugh',re.I)
ISLAM=re.compile(r'islam|muslim|qur.?an|hadis|hadith|tafsir|fiqih|fikih|aqidah|akidah|tauhid|sunnah|syariah|dakwah|khutbah|jumat|kultum|ceramah|pengajian|pesantren|kitab|sholat|shalat|zakat|puasa|haji|umrah|ramadhan|ulama|ustadz|doa|ibadah|akhlak|tasawuf|nahwu|sharaf|ushul\s+fiqh|tarjih|muhammadiyah',re.I)

def host_ok(u):
 h=urlparse(u).hostname or ''
 return any(h==x or h.endswith('.'+x) for x in ALLOWED_HOSTS)

def txt(v):
 if isinstance(v,list): return ' '.join(map(str,v))
 return str(v or '')

def normalize(s): return re.sub(r'[^a-z0-9]+','',txt(s).lower())

def classify(t):
 s=t.lower()
 if KH.search(s): return 'khutbah'
 if KU.search(s): return 'kultum'
 if TF.search(s): return 'tafsir'
 if HD.search(s): return 'hadits'
 return 'buku'

def lang(v):
 s=txt(v).lower()
 return 'id' if re.search(r'indonesia|indonesian|bahasa indonesia|\bid\b',s) else 'other'

def date_year(v):
 m=re.search(r'(19|20)\d{2}',txt(v)); return int(m.group()) if m else 0

def clean_url(base,u):
 try:return urljoin(base,txt(u).split('#')[0].strip())
 except:return ''

def wp_posts(base,search,after_pages=5):
 host=urlparse(base).hostname; out=[]
 for page in range(1,after_pages+1):
  try:
   r=S.get(f'{base}/wp-json/wp/v2/posts',params={'search':search,'per_page':PER_PAGE,'page':page,'_fields':'link,date,modified,title,content,excerpt,author'},timeout=45)
   if not r.ok: break
   rows=r.json();
   if not rows: break
   out.extend(rows)
   if len(rows)<PER_PAGE: break
  except Exception: break
 return out

def direct_docs_from_html(base,html):
 soup=BeautifulSoup(html,'html.parser'); docs=[]
 for a in soup.select('a[href],iframe[src],embed[src],source[src]'):
  u=clean_url(base,a.get('href') or a.get('src'))
  if host_ok(u) and re.search(r'\.(pdf|docx?)($|\?)',urlparse(u).path,re.I): docs.append(u)
 return docs

def post_record(site_kind,p):
 title=BeautifulSoup(txt(p.get('title',{}).get('rendered') if isinstance(p.get('title'),dict) else p.get('title')),'html.parser').get_text(' ',strip=True)
 html=txt(p.get('content',{}).get('rendered') if isinstance(p.get('content'),dict) else p.get('content'))
 link=txt(p.get('link')); cat=classify(title+' '+html+' '+link)
 if site_kind=='muhammadiyah' and 'suaramuhammadiyah' in link.lower() and KH.search(title+' '+html): cat='khutbah'
 docs=direct_docs_from_html(link or SOURCES[site_kind][0],html)
 return {'title':title,'category':cat,'source_page':link,'date':p.get('date') or p.get('modified') or '','pdf_source':next((x for x in docs if x.lower().endswith('.pdf') or '.pdf?' in x.lower()),''),'docx_source':next((x for x in docs if re.search(r'\.docx?($|\?)',x,re.I)),''),'source_group':site_kind}

def crawl():
 rec=[]
 terms={
  'muhammadiyah':['Himpunan Putusan Tarjih','Tanya Jawab Agama','pedoman','tarjih','dakwah','tafsir','khutbah','kultum','ibadah','keislaman'],
  'kemenag':['tafsir','quran','Islam','khutbah','ceramah'],
  'salafi':['tafsir','khutbah','kultum','ceramah','kitab','Islam'],
  'nu':['khutbah','tafsir','ceramah','kitab','Islam']
 }
 for group,bases in SOURCES.items():
  if group=='muhammadiyah':
   for base in bases:
    if 'buku.' in base: continue
    if 'suaramuhammadiyah' in base: searches=terms[group]
    else: searches=terms[group]
    for term in searches:
     for p in wp_posts(base,term,after_pages=3):
      try:r=post_record('muhammadiyah',p);rec.append(r)
      except Exception:pass
  else:
   for base in bases:
    for term in terms[group]:
     for p in wp_posts(base,term,after_pages=2):
      try:r=post_record(group,p);rec.append(r)
      except Exception:pass
 return rec

def direct_pdf_roots():
 roots=[
  'https://tarjih.or.id/category/gallery/download-file/',
  'https://tarjih.or.id/category/produk/putusan/',
  'https://tarjih.or.id/category/produk/wacana/',
  'https://tarjih.or.id/category/produk/fatwa/',
  'https://muhammadiyah.or.id/download/',
  'https://muhammadiyah.or.id/category/publikasi/'
 ]
 out=[]
 for root in roots:
  try:
   r=S.get(root,timeout=45);r.raise_for_status();s=BeautifulSoup(r.text,'html.parser')
   for a in s.select('a[href]'):
    u=clean_url(root,a.get('href'))
    if host_ok(u) and u.lower().endswith('.pdf'):
     t=a.get_text(' ',strip=True) or re.sub(r'\.pdf$','',u.rsplit('/',1)[-1],flags=re.I);out.append({'title':t,'category':classify(t),'source_page':root,'pdf_source':u,'source_group':'muhammadiyah'})
  except Exception: pass
 return out

def merge(rows):
 old={normalize(x.get('title')):x for x in json.load(open(OUT,encoding='utf-8')).get('items',[])} if os.path.exists(OUT) else {}
 m={}
 for r in rows:
  if not r.get('title'): continue
  t=txt(r['title'])
  if NOISE.search(t) and not ISLAM.search(t): continue
  cat=r.get('category','buku')
  r['category']=cat
  k=normalize(t)
  prev=m.get(k) or old.get(k)
  if prev:
   rr=dict(prev);rr.update({k2:v for k2,v in r.items() if v})
   m[k]=rr
  else:m[k]=r
 out=[]
 for r in m.values():
  # Visible cards must have a real downloadable file. Web articles without a real PDF/DOCX stay out of this downloadable catalog.
  if not (r.get('pdf_source') or r.get('docx_source') or r.get('pdf_url') or r.get('docx_url')): continue
  out.append(r)
 def key(r):
  group=r.get('source_group','lain'); cat=r.get('category','buku')
  source_rank={'muhammadiyah':1000,'kemenag':800,'salafi':700,'pesantren':650,'nu':500,'lain':100}.get(group,100)
  return (0 if cat!='lain' else 1,0 if lang(r.get('language'))=='id' else 1,-source_rank,-date_year(r.get('date')),-date_year(r.get('year')),txt(r.get('title')).lower())
 out.sort(key=key)
 return out[:MAX_ITEMS]

def build():
 rows=direct_pdf_roots()+crawl();items=merge(rows)
 payload={'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(items),'items':items}
 json.dump(payload,open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
 print(f'PustakaMu v2: {len(items)} downloadable records')

if __name__=='__main__':build()
