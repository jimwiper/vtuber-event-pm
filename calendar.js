// ==========================================
// Googleカレンダー連携
// ==========================================

function getEventCalendar() {
  const calendarId = PropertiesService.getScriptProperties().getProperty(PROP_CALENDAR_ID);
  if (!calendarId) throw new Error('カレンダーIDが未設定です。saveCalendarId()を実行してください');
  return CalendarApp.getCalendarById(calendarId);
}

// イベントのマイルストーンをカレンダーに一括登録
// registerEventFromForm の後、または手動でイベントIDを指定して呼ぶ
function registerMilestonesToCalendar(eventId) {
  const calendar = getEventCalendar();

  // 対象イベントの情報を取得
  const events = filterRows(SHEET.EVENTS, { 'イベントID': eventId });
  if (events.length === 0) throw new Error('イベントが見つかりません: ' + eventId);
  const event = events[0];

  // 未登録のマイルストーンを取得
  const milestones = filterRows(SHEET.MILESTONES, { 'イベントID': eventId })
    .filter(ms => ms['カレンダー登録済'] !== 'YES');

  if (milestones.length === 0) {
    Logger.log('登録済みでないマイルストーンはありません: ' + eventId);
    return 0;
  }

  let registered = 0;

  milestones.forEach(ms => {
    const dateStr = ms['日付'];
    if (!dateStr) return;

    const date = new Date(dateStr);
    const title = '【' + event['イベント名'] + '】' + ms['マイルストーン名'];
    const description = ms['備考'] || '';

    try {
      const calEvent = calendar.createAllDayEvent(title, date, { description: description });

      // シートのカレンダー登録済フラグとイベントIDを更新
      updateRowById(
        SHEET.MILESTONES,
        'マイルストーンID',
        ms['マイルストーンID'],
        {
          'カレンダー登録済': 'YES',
          'カレンダーイベントID': calEvent.getId(),
        }
      );
      registered++;
    } catch (e) {
      Logger.log('カレンダー登録失敗: ' + ms['マイルストーン名'] + ' / ' + e.message);
    }
  });

  Logger.log(eventId + ': ' + registered + '件をカレンダーに登録しました');
  return registered;
}

// 全イベントの未登録マイルストーンをまとめて登録
function registerAllPendingMilestones() {
  const events = getAllRows(SHEET.EVENTS)
    .filter(e => e['ステータス'] !== '完了' && e['ステータス'] !== '中止');

  let total = 0;
  events.forEach(e => {
    total += registerMilestonesToCalendar(e['イベントID']);
  });

  Logger.log('合計 ' + total + '件をカレンダーに登録しました');
}

// イベント本番日をカレンダーに登録（マイルストーンとは別に本番日を目立たせる）
function registerEventDayToCalendar(eventId) {
  const calendar = getEventCalendar();

  const events = filterRows(SHEET.EVENTS, { 'イベントID': eventId });
  if (events.length === 0) throw new Error('イベントが見つかりません: ' + eventId);
  const ev = events[0];

  const startDate = new Date(ev['開催日']);
  const endDate   = ev['終了日'] ? new Date(ev['終了日']) : startDate;

  // 終了日の翌日を終了として渡す（終日イベントのGAS仕様）
  const endDatePlusOne = new Date(endDate);
  endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

  const title = '本番: ' + ev['イベント名'];
  const description =
    '種別: ' + ev['種別'] + '\n' +
    '形式: ' + ev['開催形式'] + '\n' +
    '規模: ' + ev['収容規模'] + '人\n' +
    '担当: ' + ev['担当者'];

  const calEvent = calendar.createAllDayEvent(title, startDate, endDatePlusOne, {
    description: description,
    color: CalendarApp.EventColor.RED,
  });

  Logger.log('本番日をカレンダーに登録しました: ' + calEvent.getId());
  return calEvent.getId();
}
