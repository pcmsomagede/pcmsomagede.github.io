import json, re, time
from pathlib import Path
from urllib.parse import quote
import requests

BASE='https://api.quranpedia.net/v1'
OUT=Path('tafsirmu-manifest.js')

TARGETS=[
('Tafsir Ath-Thabari','جامع البيان في تأويل آي القرآن'),('Tafsir Bahrul Ulum','بحر العلوم'),('Tafsir Al-Baghawi','معالم التنزيل'),('Tafsir Al-Muharrar','المحرر الوجيز في تفسير الكتاب العزيز'),('Tafsir Al-Qur’an Al-Azhim','تفسير القرآن العظيم'),('Tafsir Ats-Tsa’labi','الكشف والبيان عن تفسير القرآن'),('Tafsir Ad-Dur Al-Mantsur','الدر المنثور في التأويل بالمأثور'),('Tafsir Fathul Qadir','فتح القدير الجامع بين فني الرواية والدراية'),('Tafsir Adhwa’ Al-Bayan','أضواء البيان'),('Tafsir Ar-Razi','مفاتيح الغيب'),('Tafsir Al-Baidhawi','أنوار التنزيل وأسرار التأويل'),('Tafsir An-Nasafi','مدارك التنزيل وحقائق التأويل'),('Tafsir Al-Khazin','لباب التأويل في معاني التنزيل'),('Tafsir Bahrul Muhith','البحر المحيط في التفسير'),('Tafsir Gharaib Al-Quran','غرائب القرآن ورغائب الفرقان'),('Tafsir Ma’ani Al-Quran','معاني القرآن'),('Kitab Majaz Al-Quran','مجاز القرآن'),('Tafsir Ma’ani Al-Quran Wa I’rabuhu','معاني القرآن وإعرابه'),('Tafsir Muqatil Bin Sulaiman','تفسير مقاتل بن سليمان'),('Tafsir Al-Quran Al-Karim','تفسير القرآن الكريم'),('Al-Ibriz Li Ma’rifati Al-Quran','الإبريز'),('Tafsir Raudhatul Irfan Fi Ma’rifati Al-Quran','روضات العرفان'),('Tafsir Al-Azhar','تفسير الأزهر'),('Tafsir Ibnu Katsir','تفسير القرآن العظيم'),('Tafsir Ath-Thabari (Edisi Lain)','جامع البيان في تأويل آي القرآن'),('Tafsir Al-Qurthubi','الجامع لأحكام القرآن'),('Tafsir Jalalain','تفسير الجلالين'),('Ahkam Al-Quran — Al-Jashash','أحكام القرآن الجصاص'),('Ahkam Al-Quran — Al-Harras','أحكام القرآن الحراس'),('Ahkam Al-Quran — Ibnul Arabi','أحكام القرآن ابن العربي'),('Al-Jami’ Li Ahkam Al-Quran — Al-Qurthubi','الجامع لأحكام القرآن'),('Al-Iklil Fi Istinbath At-Tanzil','الإكليل في استنباط التنزيل'),('Tafsir Ayat Al-Ahkam — As-Sayus','تفسير آيات الأحكام'),('Tafsir Ayat Al-Ahkam — Manna’ Al-Qathan','تفسير آيات الأحكام'),('Adhwa’ Al-Bayan — Asy-Syinqithi','أضواء البيان'),('Rawa’i’ Al-Bayan Tafsir Ayat Al-Ahkam','روائع البيان تفسير آيات الأحكام'),('At-Tafsir Wa Al-Bayan','التفسير والبيان'),('Tafsir Al-Muyassar','التفسير الميسر'),('Al-Mukhtashar Fi At-Tafsir','المختصر في تفسير القرآن الكريم'),('Tafsir As-Sa’di','تيسير الكريم الرحمن')]

s=requests.Session(); s.headers.update({'User-Agent':'PCM-Somagede-TafsirMu/1.0'})

def norm(x): return re.sub(r'[^a-z0-9\u0600-\u06ff]+','',str(x or '').lower())

def search(q):
    r=s.get(f'{BASE}/search/{quote(q)}/books',timeout=30); r.raise_for_status();
    data=r.json(); return data.get('items',[]) if isinstance(data,dict) else []

def resolve(label, query):
    candidates=[]
    for q in (query,label, query.split('(')[0].strip()):
        try: candidates += search(q)
        except Exception: continue
        if candidates: break
    nq=norm(query)
    ranked=[]
    for item in candidates:
        b=item.get('book_info') or item
        name=norm(b.get('name'))
        if not name: continue
        score=(30 if name==nq else 0)+(15 if nq in name or name in nq else 0)+sum(2 for z in re.split(r'\s+',query) if len(z)>4 and norm(z) in name)
        ranked.append((score,b))
    ranked.sort(key=lambda x:x[0],reverse=True)
    for _,b in ranked[:12]:
        try:
            d=s.get(f"{BASE}/book/{b['id']}",timeout=30); d.raise_for_status(); d=d.json()
            at=d.get('book_attachments') or []
            pdfs=[a for a in at if re.search(r'pdf',str(a.get('name','')),re.I) or re.search(r'\.pdf(?:$|\?)',str(a.get('url','')),re.I)]
            docs=[a for a in at if re.search(r'docx?',str(a.get('name','')),re.I) or re.search(r'\.docx?(?:$|\?)',str(a.get('url','')),re.I)]
            pdf=pdfs[0].get('url','') if pdfs else ''
            docx=docs[0].get('url','') if docs else ''
            if pdf:
                return {'title':label,'book_id':d.get('id',b.get('id')),'author':(d.get('author') or {}).get('full_name',''),'year':d.get('publish_year',''),'pdf':pdf,'docx':docx,'language':(d.get('language') or {}).get('code','')}
        except Exception: continue
    return {'title':label,'book_id':0,'author':'','year':'','pdf':'','docx':'','language':''}

out=[]
for i,t in enumerate(TARGETS,1):
    out.append(resolve(*t))
    time.sleep(0.12)

js='window.PCMTafsirManifest='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
OUT.write_text(js,encoding='utf-8')
print('written',OUT,'records',len(out),'pdfs',sum(bool(x['pdf']) for x in out))
if sum(bool(x['pdf']) for x in out) < 40:
    raise SystemExit('TafsirMu manifest incomplete: fewer than 40 PDFs resolved')
