import json, os, re, shutil, subprocess, tempfile, unicodedata
from pathlib import Path
from urllib.parse import urljoin
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
OUT = ROOT / 'media' / 'tafsir'
MANIFEST = DATA / 'tafsir-assets.json'
TIMEOUT = 60

SOURCES = [
    ('Tafsir Ath-Thabari', 'Abu Ja’far Muhammad bin Jarir ath-Thabari', 'https://quranpedia.net/book/14531'),
    ('Tafsir Bahrul Ulum', 'Abu al-Layth Nasr bin Muhammad as-Samarqandi', 'https://quranpedia.net/book/324'),
    ('Tafsir Al-Baghawi', 'Abu Muhammad al-Husayn bin Mas’ud al-Baghawi', 'https://quranpedia.net/book/261'),
    ('Tafsir Al-Muharrar', 'Abu Muhammad Abd al-Haqq bin Ghalib bin ‘Atiyyah', 'https://quranpedia.net/book/350'),
    ('Tafsir Al-Qur’an Al-Azhim', 'Isma’il bin ‘Umar Ibnu Katsir', 'https://quranpedia.net/book/136'),
    ('Tafsir Ats-Tsa’labi', 'Abu Ishaq Ahmad bin Muhammad ats-Tsa’labi', 'https://quranpedia.net/book/2749'),
    ('Tafsir Ad-Dur Al-Mantsur', 'Jalaluddin as-Suyuthi', 'https://quranpedia.net/book/14742'),
    ('Tafsir Fathul Qadir', 'Muhammad bin ‘Ali asy-Syaukani', 'https://quranpedia.net/book/2790'),
    ('Tafsir Ar-Razi', 'Fakhruddin ar-Razi', 'https://quranpedia.net/book/2885'),
    ('Tafsir Al-Baidhāwi', 'Abdullah bin ‘Umar al-Baidhawi', 'https://quranpedia.net/book/319'),
    ('Tafsir An-Nasafi', 'Abu al-Barakat Abdullah bin Ahmad an-Nasafi', 'https://quranpedia.net/book/14789'),
    ('Tafsir Al-Khazin', 'Alauddin ‘Ali bin Muhammad al-Khazin', 'https://quranpedia.net/book/2805'),
    ('Tafsir Bahrul Muhith', 'Abu Hayyan al-Andalusi', 'https://quranpedia.net/book/2778'),
    ('Tafsir Gharaib Al-Quran', 'Nizamuddin al-Qurasyi an-Naisaburi', 'https://quranpedia.net/book/337'),
    ('Tafsir Al-Qurthubi', 'Abu Abdullah Muhammad bin Ahmad al-Qurthubi', 'https://quranpedia.net/book/657'),
    ('Tafsir Jalalain', 'Jalaluddin al-Mahalli dan Jalaluddin as-Suyuthi', 'https://quranpedia.net/book/14637'),
    ('Tafsir As-Sa’di', 'Abdurrahman bin Nashir as-Sa’di', 'https://quranpedia.net/book/2814'),
    ('Tafsir Ma’ani Al-Quran', 'Abu Zakariya Yahya bin Ziyad al-Farra’', 'https://quranpedia.net/book/26677'),
]


def slug(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')
    return s or 'tafsir'


def get_links(html: str, exts):
    found = []
    for raw in re.findall(r'href=[\"\']([^\"\']+)[\"\']', html, flags=re.I):
        u = urljoin('https://quranpedia.net/', raw)
        if any(u.lower().split('?')[0].endswith(ext) for ext in exts):
            if 'wikiquran.nyc3.digitaloceanspaces.com' in u or 'archive.org' in u:
                if u not in found:
                    found.append(u)
    return found


def download(url, dst):
    r = requests.get(url, timeout=TIMEOUT, headers={'User-Agent':'PustakaMu-TafsirBuilder/1.0'})
    r.raise_for_status()
    dst.write_bytes(r.content)


def run(cmd, cwd=None):
    subprocess.run(cmd, cwd=cwd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def make_pdf_from_docs(docs, outpdf, tmp):
    pdfs = []
    for i, doc in enumerate(docs, 1):
        run(['libreoffice','--headless','--convert-to','pdf','--outdir',str(tmp),str(doc)])
        pdf = tmp / (doc.stem + '.pdf')
        if pdf.exists(): pdfs.append(pdf)
    if not pdfs: raise RuntimeError('no PDF generated from docs')
    if len(pdfs) == 1:
        shutil.copy2(pdfs[0], outpdf)
    else:
        run(['pdfunite', *map(str,pdfs), str(outpdf)])


def make_docx(pdf, outdocx, tmp):
    try:
        run(['libreoffice','--headless','--convert-to','docx','--outdir',str(tmp),str(pdf)])
        made = tmp / (pdf.stem + '.docx')
        if made.exists(): shutil.copy2(made, outdocx); return
    except Exception:
        pass
    # Fallback: preserve readable text in a valid DOCX when direct conversion is unavailable.
    from docx import Document
    from docx.shared import Pt
    text_path = tmp / (pdf.stem + '.txt')
    run(['pdftotext','-layout',str(pdf),str(text_path)])
    doc = Document(); p = doc.styles['Normal'].font; p.name='Noto Sans'; p.size=Pt(10)
    for line in text_path.read_text(errors='ignore').splitlines(): doc.add_paragraph(line)
    doc.save(outdocx)


def cover_from_pdf(pdf, cover):
    stem = cover.with_suffix('')
    run(['pdftoppm','-f','1','-singlefile','-png','-r','140',str(pdf),str(stem)])
    generated = stem.with_suffix('.png')
    if not generated.exists(): raise RuntimeError('cover generation failed')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for p in OUT.iterdir():
        if p.is_file(): p.unlink()
    items = []
    session = requests.Session()
    session.headers.update({'User-Agent':'PustakaMu-TafsirBuilder/1.0'})
    for title, author, page_url in SOURCES:
        try:
            html = session.get(page_url, timeout=TIMEOUT).text
            pdf_links = get_links(html, ['.pdf'])
            doc_links = get_links(html, ['.docx','.doc'])
            if not pdf_links and not doc_links:
                print('SKIP', title, 'no downloadable source')
                continue
            s = slug(title)
            with tempfile.TemporaryDirectory() as td:
                tmp = Path(td); parts = []
                if pdf_links:
                    for i,u in enumerate(pdf_links,1):
                        ext = '.pdf'; f=tmp/f'{i:03d}{ext}'; download(u,f); parts.append(f)
                    if len(parts)==1: shutil.copy2(parts[0], OUT/f'{s}.pdf')
                    else: run(['pdfunite',*map(str,parts),str(OUT/f'{s}.pdf')])
                else:
                    docs=[]
                    for i,u in enumerate(doc_links,1):
                        ext='.docx' if u.lower().endswith('.docx') else '.doc'; f=tmp/f'{i:03d}{ext}'; download(u,f); docs.append(f)
                    make_pdf_from_docs(docs, OUT/f'{s}.pdf', tmp)
                pdf = OUT/f'{s}.pdf'
                if not pdf.exists() or pdf.stat().st_size < 5000: raise RuntimeError('PDF too small')
                cover = OUT/f'{s}.png'; cover_from_pdf(pdf, cover)
                docx = OUT/f'{s}.docx'; make_docx(pdf, docx, tmp)
                if not docx.exists() or docx.stat().st_size < 1000: raise RuntimeError('DOCX missing')
                items.append({
                    'title': title,
                    'author': author,
                    'language': 'ar',
                    'category': 'tafsir',
                    'type': 'tafsir-book',
                    'source_page': page_url,
                    'pdf_url': f'/media/tafsir/{s}.pdf',
                    'docx_url': f'/media/tafsir/{s}.docx',
                    'cover_url': f'/media/tafsir/{s}.png'
                })
                print('OK', title)
        except Exception as e:
            print('FAIL', title, e)
    MANIFEST.write_text(json.dumps({'generated':'2026-08-28','items':items}, ensure_ascii=False, indent=2), encoding='utf-8')
    print('BUILT', len(items), 'verified TafsirMu assets')

if __name__ == '__main__': main()
