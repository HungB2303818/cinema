import os
import sys
import json
import time
import hashlib
import mimetypes
import urllib.request
import urllib.parse
from pathlib import Path

# Ensure stdout and stderr handle utf-8 on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def load_env(env_path):
    env_vars = {}
    if not os.path.exists(env_path):
        return env_vars
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip()
    return env_vars

def build_multipart_body(fields, files, boundary):
    lines = []
    for key, value in fields.items():
        lines.append(f'--{boundary}'.encode('utf-8'))
        lines.append(f'Content-Disposition: form-data; name="{key}"'.encode('utf-8'))
        lines.append(b'')
        lines.append(str(value).encode('utf-8'))

    for field_name, (file_name, file_content, mime_type) in files.items():
        lines.append(f'--{boundary}'.encode('utf-8'))
        lines.append(f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"'.encode('utf-8'))
        lines.append(f'Content-Type: {mime_type}'.encode('utf-8'))
        lines.append(b'')
        lines.append(file_content)

    lines.append(f'--{boundary}--'.encode('utf-8'))
    lines.append(b'')
    return b'\r\n'.join(lines)

def compute_signature(params, api_secret):
    sorted_params = sorted([(k, v) for k, v in params.items() if k not in ['file', 'api_key', 'resource_type', 'signature']])
    to_sign = '&'.join([f"{k}={v}" for k, v in sorted_params]) + api_secret
    return hashlib.sha1(to_sign.encode('utf-8')).hexdigest()

def upload_images():
    base_dir = Path(__file__).resolve().parent
    root_dir = base_dir.parent

    # Try .env in root then in current directory, fallback to .env.example
    env = load_env(root_dir / '.env')
    if not env.get('CLOUDINARY_CLOUD_NAME'):
        env.update(load_env(root_dir / '.env.example'))

    cloud_name = env.get('CLOUDINARY_CLOUD_NAME', '').strip()
    api_key = env.get('CLOUDINARY_API_KEY', '').strip()
    api_secret = env.get('CLOUDINARY_API_SECRET', '').strip()
    folder = env.get('CLOUDINARY_POSTER_FOLDER', 'cinema/posters').strip()

    if not (cloud_name and api_key and api_secret):
        print("[ERROR] Không tìm thấy đầy đủ thông tin CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong .env hoặc .env.example.")
        sys.exit(1)

    manifest_path = base_dir / 'images_manifest.json'
    if not manifest_path.exists():
        print(f"[ERROR] Không tìm thấy {manifest_path}. Vui lòng chạy download_posters.py trước.")
        sys.exit(1)

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    images_dir = base_dir / 'images'
    upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"

    print(f"Bắt đầu upload {len(manifest)} posters lên Cloudinary:")
    print(f"- Cloud Name: {cloud_name}")
    print(f"- Folder: {folder}")
    print("=" * 70)

    success_count = 0
    fail_count = 0
    results = []

    for item in manifest:
        movie_id = item['id']
        title = item['title']
        filename = item.get('local_filename')
        if not filename:
            continue

        file_path = images_dir / filename
        if not file_path.exists():
            print(f"[!] Không tìm thấy file: {file_path}")
            fail_count += 1
            continue

        with open(file_path, 'rb') as f:
            file_bytes = f.read()

        timestamp = int(time.time())
        public_id_base = Path(filename).stem
        public_id = f"{folder}/{public_id_base}"

        sign_params = {
            'public_id': public_id,
            'timestamp': timestamp,
            'overwrite': 'false'
        }
        signature = compute_signature(sign_params, api_secret)

        fields = {
            'api_key': api_key,
            'timestamp': timestamp,
            'public_id': public_id,
            'overwrite': 'false',
            'signature': signature
        }

        mime_type = mimetypes.guess_type(str(file_path))[0] or 'image/jpeg'
        files = {
            'file': (filename, file_bytes, mime_type)
        }

        boundary = f"----WebKitFormBoundary{hex(int(time.time() * 1000))[2:]}"
        body = build_multipart_body(fields, files, boundary)

        req = urllib.request.Request(
            upload_url,
            data=body,
            headers={
                'Content-Type': f'multipart/form-data; boundary={boundary}',
                'Content-Length': str(len(body))
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_json = json.loads(resp.read().decode('utf-8'))
                cloudinary_url = resp_json.get('secure_url')
                print(f"[UPLOADED] ID {movie_id:02d}: '{title}' -> {cloudinary_url}")
                item['cloudinary_url'] = cloudinary_url
                item['upload_status'] = 'SUCCESS'
                success_count += 1
                results.append((movie_id, title, cloudinary_url))
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode('utf-8')
            print(f"[FAILED] ID {movie_id:02d}: '{title}' - HTTP {e.code}: {error_msg}")
            item['upload_status'] = f"FAILED: HTTP {e.code}"
            fail_count += 1
        except Exception as e:
            print(f"[FAILED] ID {movie_id:02d}: '{title}' - {str(e)}")
            item['upload_status'] = f"FAILED: {str(e)}"
            fail_count += 1

    # Save updated manifest
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Generate SQL file with Cloudinary URLs if any succeeded
    if results:
        sql_path = base_dir / 'cgv_movies_insert_cloudinary.sql'
        # Read original sql
        orig_sql_path = base_dir / 'cgv_movies_insert.sql'
        if orig_sql_path.exists():
            with open(orig_sql_path, 'r', encoding='utf-8') as f:
                content = f.read()
            for m_id, m_title, c_url in results:
                # Find matching original poster_url in manifest
                orig_item = next((x for x in manifest if x['id'] == m_id), None)
                if orig_item and orig_item.get('poster_url'):
                    content = content.replace(orig_item['poster_url'], c_url)
            with open(sql_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"\nĐã tạo script SQL với link Cloudinary: {sql_path}")

    print("=" * 70)
    print(f"Tổng kết Upload: Thành công: {success_count}/{len(manifest)} | Thất bại: {fail_count}")

if __name__ == '__main__':
    upload_images()
