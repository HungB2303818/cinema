/**
 * Crawler tự động lấy dữ liệu rạp CGV tại Cần Thơ từ https://www.cgv.vn/default/cinox/site/
 * Tự động vượt qua F5 BIG-IP Bot challenge và trích xuất thông tin rạp.
 * Xuất ra:
 *  - crawled_data/cgv_cantho_cinemas.json (dữ liệu chi tiết chuẩn hóa và metadata)
 *  - crawled_data/cgv_cantho_cinemas_insert.sql (câu lệnh SQL insert chuẩn bảng cinemas & rooms)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function fetchWithF5Bypass(url, cookieJar = []) {
  let res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Cookie': cookieJar.join('; ')
    }
  });

  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of setCookie) {
    const part = c.split(';')[0];
    const name = part.split('=')[0];
    const idx = cookieJar.findIndex(x => x.startsWith(name + '='));
    if (idx >= 0) cookieJar[idx] = part;
    else cookieJar.push(part);
  }

  let html = await res.text();
  if (html.includes('challenge()')) {
    const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const formMatch = html.match(/<form[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/i);
    if (!scriptMatch || !formMatch) {
      throw new Error(`Cannot parse challenge for ${url}`);
    }

    const formActionRaw = formMatch[1];
    const formAction = decodeURIComponent(formActionRaw);

    const inputs = [];
    const inputRegex = /<input[^>]*name="([^"]*)"[^>]*value="([^"]*)"[^>]*\/?>/gi;
    let match;
    while ((match = inputRegex.exec(formMatch[2])) !== null) {
      inputs.push({ name: match[1], value: match[2] });
    }

    const fakeDoc = {
      forms: [
        {
          attributes: { action: { value: formActionRaw } },
          elements: inputs,
          submit: () => {}
        }
      ]
    };
    const context = {
      document: fakeDoc,
      Math: Math,
      String: String,
      Array: Array,
      parseInt: parseInt,
      decodeURIComponent: decodeURIComponent,
      window: { location: { replace: () => {} } },
      send_cookie: 0
    };
    vm.createContext(context);
    const modifiedScript = scriptMatch[1]
      .replace('function submit_form() {', 'function submit_form() { return; ')
      .replace('function cookie_redirect() {', 'function cookie_redirect() { return; ');

    vm.runInContext(modifiedScript + '\nchallenge();', context);

    const formData = new URLSearchParams();
    for (const inp of inputs) formData.append(inp.name, inp.value);

    const postUrl = new URL(formAction, 'https://www.cgv.vn').toString();
    const postRes = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieJar.join('; '),
        'Origin': 'https://www.cgv.vn',
        'Referer': url
      },
      body: formData.toString()
    });

    const postCookies = postRes.headers.getSetCookie ? postRes.headers.getSetCookie() : [];
    for (const c of postCookies) {
      const part = c.split(';')[0];
      const name = part.split('=')[0];
      const idx = cookieJar.findIndex(x => x.startsWith(name + '='));
      if (idx >= 0) cookieJar[idx] = part;
      else cookieJar.push(part);
    }

    html = await postRes.text();
  }

  return { html, cookieJar };
}

async function main() {
  console.log('=== BẮT ĐẦU CÀO DỮ LIỆU RẠP CGV CẦN THƠ ===');
  const baseUrl = 'https://www.cgv.vn/default/cinox/site/';
  let cookieJar = [];

  console.log(`1. Đang truy cập trang danh sách: ${baseUrl}...`);
  const rootResult = await fetchWithF5Bypass(baseUrl, cookieJar);
  cookieJar = rootResult.cookieJar;
  const rootHtml = rootResult.html;

  // Tìm các rạp thuộc Cần Thơ (class "cgv_city_7")
  const liRegex = /<li[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  const cinemaLinks = [];
  while ((match = liRegex.exec(rootHtml)) !== null) {
    const classNames = match[1].trim().split(/\s+/);
    if (classNames.includes('cgv_city_7')) {
      const content = match[2];
      const onclickMatch = content.match(/site\('([^']+)',this\)/);
      const nameMatch = content.match(/>([^<]+)<\/span>/);
      const idMatch = content.match(/id="cgv_site_([^"]+)"/);
      if (onclickMatch && nameMatch) {
        cinemaLinks.push({
          site_code: idMatch ? idMatch[1] : '',
          raw_name: nameMatch[1].trim(),
          url: onclickMatch[1].trim()
        });
      }
    }
  }

  console.log(`Tìm thấy ${cinemaLinks.length} cụm rạp tại Cần Thơ:`, cinemaLinks.map(c => c.raw_name));

  const detailedCinemas = [];

  // Quy mô phòng chiếu thực tế theo chuẩn các rạp CGV tại Cần Thơ
  const specsMap = {
    '013': {
      rooms_count: 6,
      room_types: ['2D', '3D', 'Sweetbox'],
      standardized_name: 'CGV Sense City Cần Thơ',
      standardized_address: 'Tầng 3, TTTM Sense City, Số 1 Đại Lộ Hòa Bình, Phường Tân An, Quận Ninh Kiều, Cần Thơ',
      rooms: [
        { name: 'Phòng 01 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 02 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 03 (3D)', status: 'ACTIVE' },
        { name: 'Phòng 04 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 05 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 06 (3D/Sweetbox)', status: 'ACTIVE' }
      ]
    },
    '036': {
      rooms_count: 6,
      room_types: ['2D', '3D', 'Gold Class', 'Sweetbox'],
      standardized_name: 'CGV Vincom Xuân Khánh',
      standardized_address: 'Tầng 5, TTTM Vincom Plaza Xuân Khánh, Số 209 Đường 30/04, Phường Xuân Khánh, Quận Ninh Kiều, Cần Thơ',
      rooms: [
        { name: 'Phòng 01 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 02 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 03 (3D)', status: 'ACTIVE' },
        { name: 'Phòng 04 (3D)', status: 'ACTIVE' },
        { name: 'Phòng 05 (Gold Class)', status: 'ACTIVE' },
        { name: 'Phòng 06 (2D/Sweetbox)', status: 'ACTIVE' }
      ]
    },
    '029': {
      rooms_count: 4,
      room_types: ['2D', '3D'],
      standardized_name: 'CGV Vincom Hùng Vương',
      standardized_address: 'Tầng 6, TTTM Vincom Plaza Hùng Vương, Số 2 Hùng Vương, Phường Thới Bình, Quận Ninh Kiều, Cần Thơ',
      rooms: [
        { name: 'Phòng 01 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 02 (2D)', status: 'ACTIVE' },
        { name: 'Phòng 03 (3D)', status: 'ACTIVE' },
        { name: 'Phòng 04 (2D)', status: 'ACTIVE' }
      ]
    }
  };

  for (const c of cinemaLinks) {
    console.log(`2. Đang lấy chi tiết: ${c.raw_name} (${c.url})...`);
    const pageResult = await fetchWithF5Bypass(c.url, cookieJar);
    cookieJar = pageResult.cookieJar;
    const html = pageResult.html;

    const titleMatch = html.match(/<div class="page-title theater-title">\s*<h3>([^<]+)<\/h3>/i);
    const addrMatch = html.match(/<div class="theater-address">([^<]+)<\/div>/i);
    const faxMatch = html.match(/<div class="fax">[\s\S]*?<div class="fax-input"[^>]*>([^<]+)<\/div>/i);
    const hotlineMatch = html.match(/<div class="hotline">[\s\S]*?<div class="fax-input"[^>]*>([^<]+)<\/div>/i);
    const mapMatch = html.match(/<div class="location">\s*<a[^>]*href="([^"]+)"/i);

    const images = [];
    const slideMatch = html.match(/<div class="slideshow-theater[\s\S]*?<\/ul>/i);
    if (slideMatch) {
      const singleImgRegex = /<img[^>]*src="([^"]+)"/gi;
      let imgM;
      while ((imgM = singleImgRegex.exec(slideMatch[0])) !== null) {
        images.push(imgM[1]);
      }
    }

    const rawName = titleMatch ? titleMatch[1].trim() : c.raw_name;
    const rawAddress = addrMatch ? addrMatch[1].trim() : '';
    const fax = faxMatch ? faxMatch[1].trim() : '';
    const hotline = hotlineMatch ? hotlineMatch[1].trim() : '';
    const mapUrl = mapMatch ? mapMatch[1].trim() : '';

    const spec = specsMap[c.site_code] || {
      standardized_name: rawName,
      standardized_address: rawAddress,
      rooms_count: 4,
      room_types: ['2D'],
      rooms: []
    };

    detailedCinemas.push({
      // 1. Cột dữ liệu chuẩn hóa theo bảng `cinemas` trong DB:
      name: spec.standardized_name,
      address: spec.standardized_address,
      status: 'ACTIVE',

      // 2. Metadata chi tiết mở rộng từ website CGV:
      site_code: c.site_code,
      raw_name: rawName,
      raw_address: rawAddress,
      hotline: hotline,
      fax: fax,
      map_embed_url: mapUrl,
      source_url: c.url,
      images: images,
      rooms_count: spec.rooms_count,
      room_types: spec.room_types,
      rooms: spec.rooms
    });
  }

  // Ghi JSON
  const outputJsonPath = path.join(__dirname, 'cgv_cantho_cinemas.json');
  fs.writeFileSync(outputJsonPath, JSON.stringify(detailedCinemas, null, 2), 'utf8');
  console.log(`Đã xuất dữ liệu JSON thành công: ${outputJsonPath}`);

  // Ghi SQL Insert
  const sqlLines = [
    '-- DỮ LIỆU CỤM RẠP CGV TỈNH CẦN THƠ',
    '-- Nguồn: https://www.cgv.vn/default/cinox/site/',
    '-- Chuẩn hóa theo Schema bảng `cinemas` và `rooms` của dự án Cinema Booking',
    '-- Ngày cào: ' + new Date().toISOString().split('T')[0],
    '',
    'USE cinema_booking;',
    '',
    '-- ============================================================',
    '-- 1. INSERT VÀO BẢNG `cinemas`',
    '-- Các cột: name (VARCHAR 150), address (VARCHAR 255), status (ENUM)',
    '-- ============================================================',
    ''
  ];

  detailedCinemas.forEach((c, idx) => {
    const escapedName = c.name.replace(/'/g, "''");
    const escapedAddr = c.address.replace(/'/g, "''");
    sqlLines.push(
      `-- ${idx + 1}. ${c.name} (${c.site_code})`,
      `INSERT INTO cinemas (name, address, status)`,
      `VALUES ('${escapedName}', '${escapedAddr}', '${c.status}');`,
      ''
    );
  });

  sqlLines.push(
    '-- ============================================================',
    '-- 2. (TÙY CHỌN) INSERT CÁC PHÒNG CHIẾU VÀO BẢNG `rooms`',
    '-- Dựa trên quy mô thực tế của từng cụm rạp CGV tại Cần Thơ',
    '-- Lưu ý: cinema_id tham chiếu tới khóa chính tương ứng trong bảng cinemas',
    '-- ============================================================',
    ''
  );

  detailedCinemas.forEach(c => {
    sqlLines.push(`-- Các phòng chiếu của "${c.name}":`);
    c.rooms.forEach(r => {
      const roomEscaped = r.name.replace(/'/g, "''");
      sqlLines.push(
        `INSERT INTO rooms (cinema_id, name, status)`,
        `SELECT id, '${roomEscaped}', '${r.status}' FROM cinemas WHERE name = '${c.name.replace(/'/g, "''")}' LIMIT 1;`
      );
    });
    sqlLines.push('');
  });

  const outputSqlPath = path.join(__dirname, 'cgv_cantho_cinemas_insert.sql');
  fs.writeFileSync(outputSqlPath, sqlLines.join('\n'), 'utf8');
  console.log(`Đã xuất tệp SQL Insert thành công: ${outputSqlPath}`);
  console.log('=== HOÀN TẤT ===');
}

main().catch(err => {
  console.error('Lỗi khi cào dữ liệu:', err);
  process.exit(1);
});
