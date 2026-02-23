/*
  --- Google Apps Script (GAS) 코드 예시 ---
  이 코드를 구글 앱스 스크립트 편집기(script.google.com)에 복사하여 배포하세요.
*/

function doGet(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('도서목록'); // 보유 도서 목록 시트 이름
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();

    const query = e.parameter.query;
    const results = data.filter(row => row[0].includes(query)); // 0번째 컬럼(도서명) 검색

    return ContentService.createTextOutput(JSON.stringify(results))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('신청내역'); // 신청 데이터가 쌓일 시트
    const item = JSON.parse(e.postData.contents);

    sheet.appendRow([
        new Date(),
        item.requester,
        item.title,
        item.author,
        item.publisher,
        item.price,
        item.isbn
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
}
