#!/usr/bin/env python3
import json, os, re, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
BASE='https://www.pcmcepu.com/'
PUSTAKA=BASE+'p/pustaka-digital-download-naskah-khutbah.html'
OUT='data/pcmcepu-content.json'
MAX_PAGES=int(os.environ.get('PCMCEPU_MAX_PAGES','900'))
WORKERS=int(os.environ.get('PCMCEPU_WORKERS','12'))
S=requests.Session(); S.headers['User-Agent']='PCM-Somagede-Content-Catalog/3.0'
def clean(u):
    if not u:return None
    if u.startswith('//'):u='https:'+u
    elif u.startswith('/'):u=urljoin(BASE,u)
    return u.split('#',1)[0] if u.startswith(('http://','https://')) else None
def category(u,text=''):
    s=(u+' '+text).lower()
    if 'al-quran' in s or 'alquran' in s or 'quran' in s:return 'al-quran'
    if 'kultum' in s:return 'kultum'
    if 'khutbah' in s:return 'khutbah'
    if 'kajian' in s:return 'kajian'
    if 'pustaka' in s or 'download' in s or '.pdf' in s or '.doc' in s:return 'pustaka'
    return 'lainnya'
def sitemap_urls():
    out=[]
    for u in (BASE+'sitemap.xml',BASE+'atom.xml?redirect=false&start-index=1&max-results=500'):
        try:
            r=S.get(u,timeout=20)
            if not r.ok:continue
            soup=BeautifulSoup(r.text,'xml')
            for loc in soup.find_all('loc'):
                x=clean(loc.get_text())
                if x and urlparse(x).netloc.endswith('pcmcepu.com'):out.append(x)
            for link in soup.find_all('link'):
                x=clean(link.get('href'))
                if x and urlparse(x).netloc.endswith('pcmcepu.com'):out.append(x)
        except Exception:pass
    return list(dict.fromkeys(out))
def local_content(soup):
    node=soup.find('article') or soup.select_one('.post-body') or soup.select_one('.entry-content') or soup.find('main')
    if not node:return ''
    for bad in node.select('script,style,iframe,form,nav,aside,.share-buttons,.post-share-buttons,.comments,.comment-thread,.related-posts'):
        bad.decompose()
    for a in node.find_all('a'):a.replace_with(a.get_text(' ',strip=True))
    for img in node.find_all('img'):
        alt=img.get('alt','').strip();img.replace_with(f'[{alt}]' if alt else '')
    allowed={'p','h1','h2','h3','h4','blockquote','ul','ol','li','strong','em','b','i','br','table','thead','tbody','tr','th','td','pre','code'}
    for tag in list(node.find_all(True)):
        if tag.name not in allowed:tag.unwrap()
        else:tag.attrs={}
    html=re.sub(r'\s+',' ',str(node).strip())
    return html[:300000]
def parse_page(u):
    try:
        r=S.get(u,timeout=25)
        if not r.ok or 'text/html' not in r.headers.get('content-type',''):return []
        soup=BeautifulSoup(r.text,'html.parser');title=(soup.title.get_text(' ',strip=True) if soup.title else u).replace(' | PCM Cepu','').strip();desc='';m=soup.find('meta',attrs={'name':'description'})
        if m:desc=(m.get('content') or '').strip()
        if not desc:
            p=soup.find('article') or soup.find('main');desc=(p.get_text(' ',strip=True)[:420] if p else '')
        published=''
        for sel in ('time[datetime]','meta[itemprop="datePublished"]','abbr.published'):
            el=soup.select_one(sel)
            if el:published=el.get('datetime') or el.get('content') or el.get_text(' ',strip=True);break
        txt=soup.get_text(' ',strip=True);cat=category(u,txt[:7000]);rows=[{'title':title,'description':desc,'url':u,'category':cat,'published':published,'content_html':local_content(soup)}]
        if u==PUSTAKA:
            for a in soup.find_all('a',href=True):
                x=clean(a['href']);label=a.get_text(' ',strip=True)
                if not x or not label or label.upper() in {'LIHAT PDF','LIHAT WORD','PROSES'}:continue
                if urlparse(x).netloc.endswith('pcmcepu.com') and ('pdf' in x.lower() or 'doc' in x.lower()):rows.append({'title':label,'description':'Materi pustaka digital PCM Cepu.','url':x,'category':'pustaka','published':'','content_html':''})
        return rows
    except Exception:return []
def main():
    urls=[PUSTAKA]+sitemap_urls();preferred=[u for u in urls if any(k in u.lower() for k in ('kajian','kultum','khutbah','pustaka','alquran','al-quran')) or u==PUSTAKA];urls=list(dict.fromkeys(preferred+urls))[:MAX_PAGES];rows=[]
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs=[ex.submit(parse_page,u) for u in urls]
        for f in as_completed(futs):rows.extend(f.result())
    by={x['url']+'|'+x['title']:x for x in rows if x.get('title')};rows=sorted(by.values(),key=lambda x:(x.get('published',''),x['title']),reverse=True);os.makedirs('data',exist_ok=True)
    with open(OUT,'w',encoding='utf-8') as f:json.dump({'source':'PCM Cepu','source_home':BASE,'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(rows),'items':rows},f,ensure_ascii=False,indent=2)
    print('PCM Cepu local catalog:',len(rows),'items from',len(urls),'pages')
if __name__=='__main__':main()
