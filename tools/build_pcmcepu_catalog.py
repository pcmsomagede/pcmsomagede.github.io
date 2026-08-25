#!/usr/bin/env python3
import json, os, re, time
from collections import deque
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
BASE='https://www.pcmcepu.com/'
OUT='data/pcmcepu-content.json'
MAX_PAGES=int(os.environ.get('PCMCEPU_MAX_PAGES','5000'))
S=requests.Session(); S.headers['User-Agent']='PCM-Somagede-Content-Catalog/1.0'

def clean(u):
    if not u:return None
    if u.startswith('//'):u='https:'+u
    elif u.startswith('/'):u=urljoin(BASE,u)
    return u.split('#',1)[0] if u.startswith(('http://','https://')) else None

def category(u,text=''):
    s=(u+' '+text).lower()
    if 'al-quran' in s or 'alquran' in s:return 'al-quran'
    if 'kultum' in s:return 'kultum'
    if 'khutbah' in s:return 'khutbah'
    if 'kajian' in s:return 'kajian'
    if 'pustaka' in s or 'download' in s:return 'pustaka'
    return 'lainnya'

def sitemap():
    out=[]
    for u in (BASE+'sitemap.xml',BASE+'atom.xml?redirect=false&start-index=1&max-results=500'):
        try:
            r=S.get(u,timeout=30)
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

def main():
    q=deque(sitemap() or [BASE]); seen=set(); rows=[]
    while q and len(seen)<MAX_PAGES:
        u=q.popleft()
        if u in seen or not urlparse(u).netloc.endswith('pcmcepu.com'):continue
        seen.add(u)
        try:r=S.get(u,timeout=30)
        except Exception:continue
        if not r.ok or 'text/html' not in r.headers.get('content-type',''):continue
        soup=BeautifulSoup(r.text,'html.parser')
        title=(soup.title.get_text(' ',strip=True) if soup.title else u).replace(' | PCM Cepu','').strip()
        desc=''
        m=soup.find('meta',attrs={'name':'description'})
        if m:desc=(m.get('content') or '').strip()
        if not desc:
            p=soup.find('article') or soup.find('main')
            desc=(p.get_text(' ',strip=True)[:360] if p else '')
        published=''
        for sel in ('time[datetime]','meta[itemprop="datePublished"]','abbr.published'):
            el=soup.select_one(sel)
            if el:published=el.get('datetime') or el.get('content') or el.get_text(' ',strip=True);break
        txt=soup.get_text(' ',strip=True)
        rows.append({'title':title,'description':desc,'url':u,'category':category(u,txt[:5000]),'published':published})
        for a in soup.find_all('a',href=True):
            x=clean(a['href'])
            if x and urlparse(x).netloc.endswith('pcmcepu.com') and x not in seen and len(q)<MAX_PAGES*2:q.append(x)
    rows=sorted({x['url']:x for x in rows}.values(),key=lambda x:(x.get('published',''),x['title']),reverse=True)
    os.makedirs('data',exist_ok=True)
    with open(OUT,'w',encoding='utf-8') as f:json.dump({'source':'PCM Cepu','generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(rows),'items':rows},f,ensure_ascii=False,indent=2)
    print('catalog pages',len(rows))
if __name__=='__main__':main()
