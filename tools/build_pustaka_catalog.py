#!/usr/bin/env python3
import json, os, re, time
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

PAGE='https://www.pcmcepu.com/p/pustaka-digital-download-naskah-khutbah.html'
CLOUD=os.environ.get('CLOUDINARY_CLOUD_NAME','v6hqki7m')
PRESET=os.environ.get('CLOUDINARY_UPLOAD_PRESET','pcmsomagede_document')
OUT='data/pustaka-catalog.json'
LIMIT=int(os.environ.get('PUSTAKA_MAX_ITEMS','180'))
S=requests.Session(); S.headers['User-Agent']='PCM-Somagede-Pustaka-Builder/1.0'

def clean(u):
    if not u:return None
    return urljoin(PAGE,u.split('#')[0].strip())

def slug(s):
    s=re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
    return s[:100] or 'item'

def upload(url,title):
    path=urlparse(url).path.lower()
    rt='image' if path.endswith('.pdf') or any(path.endswith(x) for x in ('.jpg','.jpeg','.png','.webp')) else ('video' if any(path.endswith(x) for x in ('.mp3','.wav','.m4a','.ogg')) else 'raw')
    r=S.post(f'https://api.cloudinary.com/v1_1/{CLOUD}/{rt}/upload',data={'file':url,'upload_preset':PRESET,'tags':'pustaka_somagede','context':f'title={title}'},timeout=45)
    r.raise_for_status(); return r.json()

def main():
    html=S.get(PAGE,timeout=45); html.raise_for_status(); soup=BeautifulSoup(html.text,'html.parser')
    items=[]; seen=set()
    for a in soup.select('a[href]'):
        href=clean(a.get('href')); text=' '.join(a.stripped_strings)
        if not href or not text: continue
        p=urlparse(href).path.lower()
        if not any(p.endswith(x) for x in ('.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx','.mp3','.wav','.m4a')): continue
        key=href
        if key in seen: continue
        seen.add(key)
        cat='Khutbah' if 'khutbah' in text.lower() or 'khutbah' in href.lower() else ('Booklet' if 'booklet' in text.lower() else 'Buku & Referensi')
        items.append({'title':text,'category':cat,'source':href})
        if len(items)>=LIMIT: break
    old={x.get('source'):x for x in json.load(open(OUT,encoding='utf-8')).get('items',[])} if os.path.exists(OUT) else {}
    out=[]
    for n,item in enumerate(items,1):
        if item['source'] in old and old[item['source']].get('cloudinary_url'):
            out.append(old[item['source']]); continue
        try:
            r=upload(item['source'],item['title']); item['cloudinary_url']=r.get('secure_url') or r.get('url'); item['public_id']=r.get('public_id'); item['resource_type']=r.get('resource_type'); item['status']='ready'
            if item.get('resource_type')=='image' and item['source'].lower().endswith('.pdf') and item.get('cloudinary_url'):
                item['cover_url']=item['cloudinary_url'].rsplit('.',1)[0]+'.jpg'
        except Exception as e:
            item['status']='pending'; item['error']=str(e)[:240]
        out.append(item); print(f'{n}/{len(items)} {item["status"]}: {item["title"]}')
    json.dump({'generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'total':len(out),'items':out},open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
if __name__=='__main__':main()
