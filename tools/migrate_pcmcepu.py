#!/usr/bin/env python3
import json, os, re, sys, time
from collections import deque
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE = "https://www.pcmcepu.com/"
CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "v6hqki7m")
PRESET = os.environ.get("CLOUDINARY_UPLOAD_PRESET", "pcmsomagede_document")
OUT = "data/pcmcepu-media.json"
MAX_PAGES = int(os.environ.get("PCMCEPU_MAX_PAGES", "5000"))
TIMEOUT = 30
HEADERS = {"User-Agent": "PCM-Somagede-Media-Migrator/1.0"}

session = requests.Session()
session.headers.update(HEADERS)


def clean_url(u):
    if not u:
        return None
    u = u.strip()
    if u.startswith("//"):
        u = "https:" + u
    elif u.startswith("/"):
        u = urljoin(BASE, u)
    if not u.startswith(("http://", "https://")):
        return None
    return u.split("#", 1)[0]


def kind(url, page_url=""):
    s = (url + " " + page_url).lower()
    path = urlparse(url).path.lower()
    if any(x in path for x in (".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg")):
        return "audio"
    if any(x in path for x in (".pdf",)):
        return "pdf"
    if any(x in path for x in (".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx")):
        return "document"
    if any(x in path for x in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")):
        return "image"
    if "googleusercontent.com" in s or "blogger.googleusercontent.com" in s:
        return "image"
    return None


def category(page_url, text=""):
    s = (page_url + " " + text).lower()
    if "al-quran" in s or "al_quran" in s or "alquran" in s:
        return "al-quran"
    if "kultum" in s:
        return "kultum"
    if "khutbah" in s or "khutbah-jumat" in s or "khutbah-id" in s:
        return "khutbah"
    if "kajian" in s:
        return "kajian"
    if "pustaka" in s or "download" in s or ".pdf" in s or ".doc" in s:
        return "pustaka"
    return "lainnya"


def sitemap_urls():
    urls = []
    candidates = [
        "https://www.pcmcepu.com/sitemap.xml",
        "https://www.pcmcepu.com/atom.xml?redirect=false&start-index=1&max-results=500",
    ]
    for u in candidates:
        try:
            r = session.get(u, timeout=TIMEOUT)
            if not r.ok:
                continue
            soup = BeautifulSoup(r.text, "xml")
            for loc in soup.find_all("loc"):
                x = clean_url(loc.get_text())
                if x and urlparse(x).netloc.endswith("pcmcepu.com"):
                    urls.append(x)
            for link in soup.find_all("link"):
                x = clean_url(link.get("href"))
                if x and urlparse(x).netloc.endswith("pcmcepu.com"):
                    urls.append(x)
        except Exception as e:
            print("sitemap error", u, e)
    return list(dict.fromkeys(urls))


def crawl():
    seed = sitemap_urls()
    q = deque(seed or [BASE])
    seen = set()
    pages = []
    assets = {}
    while q and len(seen) < MAX_PAGES:
        u = q.popleft()
        if u in seen:
            continue
        p = urlparse(u)
        if p.netloc and not p.netloc.endswith("pcmcepu.com"):
            continue
        seen.add(u)
        try:
            r = session.get(u, timeout=TIMEOUT)
            if not r.ok or "text/html" not in r.headers.get("content-type", ""):
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            txt = soup.get_text(" ", strip=True)
            cat = category(u, txt[:6000])
            pages.append({"url": u, "category": cat})
            found = []
            for tag in soup.find_all(["a", "img", "source", "audio", "video", "iframe", "embed", "object"]):
                for attr in ("href", "src", "data-src", "data-url"):
                    x = clean_url(tag.get(attr))
                    if x:
                        k = kind(x, u)
                        if k:
                            found.append((x, k))
            for x, k in found:
                assets.setdefault(x, {"source": x, "kind": k, "category": cat, "pages": []})["pages"].append(u)
            for a in soup.find_all("a", href=True):
                x = clean_url(a.get("href"))
                if x and urlparse(x).netloc.endswith("pcmcepu.com") and x not in seen and len(q) < MAX_PAGES * 2:
                    if any(x.lower().endswith(ext) for ext in (".pdf", ".doc", ".docx", ".mp3", ".wav", ".m4a")):
                        continue
                    q.append(x)
        except Exception as e:
            print("page error", u, e)
        if len(seen) % 50 == 0:
            print(f"crawled {len(seen)} pages, found {len(assets)} assets")
    return pages, list(assets.values())


def cloudinary_upload(item):
    src = item["source"]
    k = item["kind"]
    if k == "audio":
        rt = "video"
    elif k in ("document",):
        rt = "raw"
    else:
        rt = "image"
    endpoint = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/{rt}/upload"
    data = {
        "file": src,
        "upload_preset": PRESET,
        "tags": f"pcmcepu_migrated,{item['category']},pcm_somagede",
        "context": f"source_url={src}",
    }
    r = session.post(endpoint, data=data, timeout=TIMEOUT)
    if r.ok:
        return r.json()
    try:
        detail = r.json()
    except Exception:
        detail = r.text[:500]
    raise RuntimeError(f"Cloudinary {r.status_code}: {detail}")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    pages, assets = crawl()
    print(f"Pages: {len(pages)}; assets: {len(assets)}")
    manifest = {
        "source": "PCM Cepu",
        "source_home": BASE,
        "cloudinary_cloud": CLOUD_NAME,
        "preset": PRESET,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pages": pages,
        "assets": [],
    }
    old = {}
    if os.path.exists(OUT):
        try:
            old = {x.get("source"): x for x in json.load(open(OUT, encoding="utf-8")).get("assets", [])}
        except Exception:
            old = {}
    for i, item in enumerate(assets, 1):
        if item["source"] in old and old[item["source"]].get("cloudinary_url"):
            item.update(old[item["source"]])
            manifest["assets"].append(item)
            continue
        try:
            result = cloudinary_upload(item)
            item["cloudinary_url"] = result.get("secure_url") or result.get("url")
            item["public_id"] = result.get("public_id")
            item["resource_type"] = result.get("resource_type")
            item["status"] = "migrated"
            print(f"[{i}/{len(assets)}] OK {item['kind']} {item['source']}")
        except Exception as e:
            item["status"] = "fallback"
            item["error"] = str(e)
            print(f"[{i}/{len(assets)}] FALLBACK {item['kind']} {item['source']} :: {e}")
        manifest["assets"].append(item)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    ok = sum(1 for x in manifest["assets"] if x.get("status") == "migrated")
    print(f"Migrated: {ok}; fallback: {len(manifest['assets']) - ok}")


if __name__ == "__main__":
    main()
