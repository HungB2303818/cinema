import os
import re
import sys
import json
import urllib.request
import unicodedata

# Ensure stdout and stderr handle utf-8 on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def slugify(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '_', text)
    return text

def download_posters():
    json_path = os.path.join(os.path.dirname(__file__), 'cgv_coming_soon_movies.json')
    images_dir = os.path.join(os.path.dirname(__file__), 'images')
    os.makedirs(images_dir, exist_ok=True)

    with open(json_path, 'r', encoding='utf-8') as f:
        movies = json.load(f)

    manifest = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.cgv.vn/'
    }

    print(f"Bắt đầu tải poster cho {len(movies)} phim vào thư mục: {images_dir}\n" + "="*70)

    success_count = 0
    fail_count = 0

    for movie in movies:
        movie_id = movie.get('id', 0)
        title = movie.get('title', f'movie_{movie_id}')
        poster_url = movie.get('poster_url', '').strip()

        if not poster_url:
            print(f"[!] ID {movie_id:02d}: '{title}' không có poster_url. Bỏ qua.")
            fail_count += 1
            continue

        slug = slugify(title)
        ext = '.jpg'
        if '.' in poster_url.split('/')[-1]:
            candidate_ext = os.path.splitext(poster_url.split('?')[0])[-1].lower()
            if candidate_ext in ['.jpg', '.jpeg', '.png', '.webp']:
                ext = candidate_ext

        filename = f"{movie_id:02d}_{slug}{ext}"
        filepath = os.path.join(images_dir, filename)

        try:
            req = urllib.request.Request(poster_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as response:
                content = response.read()

            with open(filepath, 'wb') as out_f:
                out_f.write(content)

            file_size_kb = len(content) / 1024
            print(f"[OK] ID {movie_id:02d}: '{title}' -> {filename} ({file_size_kb:.1f} KB)")
            success_count += 1

            manifest.append({
                'id': movie_id,
                'title': title,
                'poster_url': poster_url,
                'local_filename': filename,
                'local_relative_path': f"images/{filename}",
                'size_bytes': len(content),
                'status': 'DOWNLOADED'
            })
        except Exception as e:
            print(f"[ERROR] ID {movie_id:02d}: '{title}' lỗi khi tải từ {poster_url} - {str(e)}")
            fail_count += 1
            manifest.append({
                'id': movie_id,
                'title': title,
                'poster_url': poster_url,
                'status': f"FAILED: {str(e)}"
            })

    manifest_path = os.path.join(os.path.dirname(__file__), 'images_manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("="*70)
    print(f"Tổng kết: Thành công: {success_count}/{len(movies)} | Thất bại: {fail_count}")
    print(f"Manifest lưu tại: {manifest_path}")

if __name__ == '__main__':
    download_posters()
