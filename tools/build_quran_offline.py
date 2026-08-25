#!/usr/bin/env python3
import json, os, time, requests
API='https://api.alquran.cloud/v1/quran/editions/quran-uthmani,id.indonesian'
OUT='data/quran-offline.json'
def main():
    r=requests.get(API,timeout=60,headers={'User-Agent':'PCM-Somagede-Quran-Offline-Builder/2.0'})
    r.raise_for_status();payload=r.json();data=payload.get('data') or []
    if len(data)<2:raise RuntimeError('Quran corpus incomplete')
    os.makedirs('data',exist_ok=True)
    out={'source':'Al-Qur’anMu','generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'data':data}
    with open(OUT,'w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'))
    print('offline Quran editions:',len(data),'->',OUT)
if __name__=='__main__':main()
