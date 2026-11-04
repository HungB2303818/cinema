import json
import re
import sys
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

base_dir = Path(__file__).resolve().parent

# 1. Load movies
json_path = base_dir / 'cgv_coming_soon_movies.json'
with open(json_path, 'r', encoding='utf-8') as f:
    movies = json.load(f)

# Selected 17 movies for SHOWING (17/34 = exactly 50%)
# Mandatory: Godzilla (ID 2), Avengers (ID 20)
showing_ids = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 20}

showing_titles = []
upcoming_titles = []

for m in movies:
    m_id = m['id']
    if m_id in showing_ids:
        m['status'] = 'SHOWING'
        showing_titles.append((m_id, m['title']))
    else:
        m['status'] = 'UPCOMING'
        upcoming_titles.append((m_id, m['title']))

# Save updated JSON
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(movies, f, ensure_ascii=False, indent=2)

print(f"JSON: Đã cập nhật {len(showing_titles)} phim SHOWING và {len(upcoming_titles)} phim UPCOMING.")

# 2. Update SQL files statement by statement
def update_sql_file(sql_file_path):
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into header and statements
    header = ""
    if "INSERT INTO movies" in content:
        header_idx = content.find("INSERT INTO movies")
        header = content[:header_idx]
        stmts_content = content[header_idx:]
    else:
        stmts_content = content

    # Regex find each INSERT INTO movies ... ;
    # Pattern matching INSERT INTO movies ... ;
    pattern = re.compile(r"(INSERT INTO movies\s*\(.*?\)\s*VALUES\s*\(.*?\);)", re.DOTALL)
    statements = pattern.findall(stmts_content)

    updated_stmts = []
    showing_stmt_count = 0
    upcoming_stmt_count = 0

    for stmt in statements:
        # Check which movie title is in this statement
        is_showing = False
        for s_id in showing_ids:
            movie_obj = next((x for x in movies if x['id'] == s_id), None)
            if movie_obj and f"'{movie_obj['title']}'" in stmt:
                is_showing = True
                break
        
        # Replace the trailing status before );
        if is_showing:
            # Replace 'UPCOMING'); with 'SHOWING');
            new_stmt = re.sub(r"'(?:UPCOMING|SHOWING)'\s*\);", "'SHOWING');", stmt)
            showing_stmt_count += 1
        else:
            # Replace 'SHOWING'); with 'UPCOMING');
            new_stmt = re.sub(r"'(?:UPCOMING|SHOWING)'\s*\);", "'UPCOMING');", stmt)
            upcoming_stmt_count += 1
        
        updated_stmts.append(new_stmt)

    new_content = header + "\n\n".join(updated_stmts) + "\n"
    with open(sql_file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"{sql_file_path.name}: {showing_stmt_count} SHOWING, {upcoming_stmt_count} UPCOMING (Tổng: {len(statements)})")

update_sql_file(base_dir / 'cgv_movies_insert.sql')
if (base_dir / 'cgv_movies_insert_cloudinary.sql').exists():
    update_sql_file(base_dir / 'cgv_movies_insert_cloudinary.sql')

print("\n=== DANH SÁCH 17 PHIM ĐANG CHIẾU (SHOWING) ===")
for m_id, title in sorted(showing_titles):
    print(f" [{m_id:02d}] {title}")

print("\n=== DANH SÁCH 17 PHIM SẮP CHIẾU (UPCOMING) ===")
for m_id, title in sorted(upcoming_titles):
    print(f" [{m_id:02d}] {title}")
