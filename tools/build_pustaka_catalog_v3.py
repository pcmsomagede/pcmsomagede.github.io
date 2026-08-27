#!/usr/bin/env python3
import json,re,os,time
from pathlib import Path
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
import fitz
from docx import Document

OUT=Path('data/pustaka-catalog.json'); PDF=Path('assets/pustaka-files'); DOCX=Path('assets/pustaka-docx'); COV=Path('assets/pustaka-covers')
PER=100; MAX=int(os.getenv('PUSTAKA_MAX_ITEMS','1000000')); S=requests.Session(); S.headers.update({'User-Agent':'PCM-Somagede-Pustaka/9.0'})
MUH=['https://muhammadiyah.or.id','https://tarjih.or.id']; NOISE=re.compile(r'computer|programming|python|astronomy|physics|chemistry|mathematics|business|marketing|finance|engineering|medicine|travel|cooking|recipe|novel|romance|crime|fiction|patrice|lucas|widner|rogers|monge|washington',re.I)

QUERIES={'khutbah':['Khutbah Jumat','Khutbah Idul Fitri','Khutbah Gerhana'],'kultum':['kultum','ceramah singkat','kuliah tujuh menit','pidato agama'],'tafsir':['tafsir','Tafsir Al-Quran','Tafsir Al-Qur’an']}
KNOWN_BOOKS=[('Tuntunan Thaharah','https://tarjih.or.id/wp-content/uploads/2020/08/ebook-Tuntunan-Thaharah.pdf'),('Tuntunan Walimah','https://tarjih.or.id/wp-content/uploads/2020/08/ebook-Tuntunan-Walimah.pdf'),('Hukum Takziah dan Ziarah Kubur','https://tarjih.or.id/wp-content/uploads/2022/01/Hukum-Takziah-dan-Ziarah-Kubur.pdf'),('Akhlak Terhadap Allah','https://tarjih.or.id/wp-content/uploads/2023/01/Kapita-Selekta-Putusan-Fatwa-Tarjih-Akhlak-Terhadap-Allah.pdf')]
KNOWN_TAFSIR=[('Tafsir At-Tanwir Al-Baqarah 130-134','https://tarjih.or.id/wp-content/uploads/2021/03/Tafsir-al-Baqarah-Ayat-130-134-materi-pengajian-tarjih-edisi-120.pdf')]

def slug(t): return re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-')[:90] or 'dokumen'
def body_text(html):
 s=BeautifulSoup(html,'html.parser')
 for z in s.select('script,style,noscript,nav,header,footer,form,svg'): z.decompose()
 root=s.select_one('article') or s.select_one('.entry-content') or s.select_one('.post-content') or s.select_one('main') or s
 a=[]
 for e in root.select('h1,h2,h3,p,li,blockquote'):
  t=e.get_text(' ',strip=True)
  if t and t not in a:a.append(t)
 return '\n\n'.join(a)
def pdf_text(txt,title,path):
 if path.exists(): return True
 try:
  d=fitz.open(); pg=d.new_page(); y=48; w=pg.rect.width-72; pg.insert_text((36,y),title[:110],fontsize=16); y+=28
  for para in re.split(r'\n\s*\n',txt):
   line=''
   for word in para.split():
    test=(line+' '+word).strip()
    if fitz.get_text_length(test,fontname='helv',fontsize=10)<=w: line=test
    else:
     if y>pg.rect.height-42: pg=d.new_page(); y=42
     pg.insert_text((36,y),line,fontsize=10); y+=15; line=word
   if line:
    if y>pg.rect.height-42: pg=d.new_page(); y=42
    pg.insert_text((36,y),line,fontsize=10); y+=15
   y+=7
  path.parent.mkdir(parents=True,exist_ok=True); d.save(path); d.close(); return True
 except Exception:return False
def docx_text(txt,title,path):
 if path.exists(): return True
 try:
  path.parent.mkdir(parents=True,exist_ok=True); d=Document(); d.add_heading(title,0)
  for p in re.split(r'\n\s*\n',txt):
   p=p.strip()
   if p:d.add_paragraph(p)
  d.save(path); return True
 except Exception:return False
def make_cover(pdf_path,path):
 if path.exists(): return True
 try:
  d=fitz.open(pdf_path); pix=d[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False); path.parent.mkdir(parents=True,exist_ok=True); pix.save(path); d.close(); return True
 except Exception:return False
def article(cat,url,group='muhammadiyah'):
 try:
  r=S.get(url,timeout=45); r.raise_for_status(); s=BeautifulSoup(r.text,'html.parser'); h=s.select_one('h1') or s.title; title=h.get_text(' ',strip=True) if h else url
  txt=body_text(r.text)
  if len(txt)<220:return None
  n=slug(title); pp=PDF/(n+'.pdf'); dp=DOCX/(n+'.docx'); cp=COV/(n+'.jpg')
  if not pdf_text(txt,title,pp) or not docx_text(txt,title,dp) or not make_cover(pp,cp):return None
  return {'title':title,'category':cat,'source_page':url,'language':'id','source_group':group,'date':next(re.findall(r'(?:19|20)\d{2}',url),''),'pdf_source':'/'+str(pp).replace('\\','/'),'docx_source':'/'+str(dp).replace('\\','/'),'cover_url':'/'+str(cp).replace('\\','/')}
 except Exception:return None
def posts(base,term,pages=5):
 out=[]
 for p in range(1,pages+1):
  try:
   r=S.get(base+'/wp-json/wp/v2/posts',params={'search':term,'per_page':PER,'page':p,'_fields':'link,date,modified,title,content'},timeout=40)
   if not r.ok:break
   rows=r.json(); out+=rows
   if len(rows)<PER:break
  except Exception:break
 return out
def remote_pdf(title,url,cat):
 try:
  r=S.get(url,timeout=90); r.raise_for_status(); n=slug(title); pp=PDF/(n+'.pdf'); dp=DOCX/(n+'.docx'); cp=COV/(n+'.jpg'); pp.parent.mkdir(parents=True,exist_ok=True); pp.write_bytes(r.content)
  d=fitz.open(pp); txt='\n\n'.join(pg.get_text('text') for pg in d); d.close()
  if not docx_text(txt,title,dp) or not make_cover(pp,cp):return None
  return {'title':title,'category':cat,'source_page':url,'language':'id','source_group':'muhammadiyah','pdf_source':'/'+str(pp).replace('\\','/'),'docx_source':'/'+str(dp).replace('\\','/'),'cover_url':'/'+str(cp).replace('\\','/')}
 except Exception:return None
def build():
 rows=[]
 for cat,terms in QUERIES.items():
  for term in terms:
   for base in MUH:
    for p in posts(base,term):
     r=article(cat,p.get('link',''))
     if r and not NOISE.search(r['title']): rows.append(r)
 for title,url in KNOWN_BOOKS:
  r=remote_pdf(title,url,'buku')
  if r:rows.append(r)
 for title,url in KNOWN_TAFSIR:
  r=remote_pdf(title,url,'tafsir')
  if r:rows.append(r)
 old=json.loads(OUT.read_text(encoding='utf-8')).get('items',[]) if OUT.exists() else []
 for r in old:
  if r.get('pdf_source','').startswith('/assets/') and r.get('docx_source','').startswith('/assets/') and r.get('cover_url','').startswith('/assets/'): rows.append(r)
 seen={};
 for r in rows:
  k=re.sub(r'\W+','',r['title'].casefold()); seen.setdefault(k,r)
 rank={'muhammadiyah':5000,'kemenag':4000,'salafi':3000,'nu':2000}
 def key(r):
  y=int(re.search(r'(19|20)\d{2}',str(r.get('date',''))).group()) if re.search(r'(19|20)\d{2}',str(r.get('date',''))) else 0
  return (0 if r.get('language')=='id' else 1,-rank.get(r.get('source_group'),100),-y,r['title'].casefold())
 items=sorted(seen.values(),key=key)[:MAX]
 OUT.write_text(json.dumps({'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(items),'items':items},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('usable PustakaMu records:',len(items))
if __name__=='__main__':build()
