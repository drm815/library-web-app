function doGet(e) {                          
    const action = e.parameter.action;
                                                                                         
    if (action === 'login') {
      const html = HtmlService.createHtmlOutput(`                                        
        <!DOCTYPE html>                                     
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: 'Apple SD Gothic Neo', sans-serif; background: #050a1a;
   color: #f0f4f8; display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 20px; }
              .card { background: #0d1530; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px; padding: 32px; width: 100%; max-width: 360px; }
              h2 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
              p { font-size: 12px; color: #64748b; margin-bottom: 24px; }
              label { font-size: 12px; color: #94a3b8; display: block; margin-bottom:
  6px; }
              input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid
  rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; color: #f0f4f8; font-size:
  14px; outline: none; margin-bottom: 16px; }
              input:focus { border-color: #38bdf8; }
              button { width: 100%; background: #38bdf8; color: #0f172a; font-weight:
  700; font-size: 14px; padding: 14px; border: none; border-radius: 12px; cursor:
  pointer; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>신청자 정보 입력</h2>
              <p>희망도서 신청을 위해 정보를 입력해주세요.</p>
              <label>이름</label>
              <input type="text" id="name" placeholder="홍길동" />
              <button onclick="submit()">확인</button>
            </div>
            <script>
              function submit() {
                const name = document.getElementById('name').value.trim();
                if (!name) { alert('이름을 입력해주세요.'); return; }
                window.opener && window.opener.postMessage({ name: name }, '*');
                window.close();
              }
            <\/script>
          </body>
        </html>
      `);
      return html;
    }
// 신청내역 조회
    if (action === 'history') {
    const name = e.parameter.name || '';
    const ss = SpreadsheetApp.openById('1Zm6z-dIIzh3LEtuOzZk-yZmQkyAGbdb7dULvaghbWpU'); // doPost와 동일한 ID
    const sheet = ss.getSheetByName('신청내역');
      const data = sheet.getDataRange().getValues();
      data.shift(); // 헤더 제거

      const results = data
        .filter(row => String(row[2]) === name) // 이름 기준 필터
        .map(row => ({
          date: row[0],
          role: row[1],
          name: row[2],
          title: row[3],
          author: row[4],
          publisher: row[5],
          price: row[6],
          isbn: row[7]
        }));

      return ContentService.createTextOutput(JSON.stringify(results))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // 도서 검색
    const ss = SpreadsheetApp.openById('1hiXa2igVaBuqsjNyEfTf3cKwH7HcMstpj87nfTolg70');
    const sheet = ss.getSheetByName('도서목록');
    const data = sheet.getDataRange().getValues();
    data.shift();

    const query = e.parameter.query || '';
    const results = data                                                                   
    .filter(row => String(row[3]).includes(query) || String(row[4]).includes(query))     
    .map(row => ({                                                                       
      title: row[3],        // D열 = 자료명                                              
      author: row[4],       // E열 = 저자
      publisher: row[5],    // F열 = 출판사
      price: '',
      isbn: String(row[2]), // C열 = 등록번호
      coverUrl: '',
      isExisting: true
    }));

    return ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function doPost(e) {
    const ss = SpreadsheetApp.openById('1Zm6z-dIIzh3LEtuOzZk-yZmQkyAGbdb7dULvaghbWpU');
    const sheet =
  ss.getSheetByName('신청내역');
    const item =
  JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date(),
      item.requesterRole,
      item.requesterName,
      item.title,
      item.author,
      item.publisher,
      item.price,
      item.isbn,
      item.kdcCode || '',
      item.kdcName || '',
      item.callNo || ''
    ]);

    return ContentService.createTextOutput(JSON
  .stringify({ status: 'success' }))

  .setMimeType(ContentService.MimeType.JSON);
  }