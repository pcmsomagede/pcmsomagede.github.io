#!/usr/bin/env python3
import json, os, time, requests
APIS=['https://api.alquran.cloud/v1/quran/quran-uthmani','https://api.alquran.cloud/v1/quran/id.indonesian']
OUT='data/quran-offline.json'
def main():
    data=[]
    for api in APIS:
        r=requests.get(api,timeout=90,headers={'User-Agent':'PCM-Somagede-Quran-Offline-Builder/3.0'});r.raise_for_status();payload=r.json();d=payload.get('data')
        if not d or not d.get('surahs'):raise RuntimeError('Incomplete Quran edition: '+api)
        data.append(d)
    os.makedirs('data',exist_ok=True)
    out={'source':'Al-Qur’anMu','generated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'data':data}
    with open(OUT,'w',encoding='utf-8') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'))
    print('offline Quran editions:',len(data),'surahs:',len(data[0]['surahs']))
if __name__=='__main__':main()
