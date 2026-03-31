// ==========================================
// マスタ活用：会場検索・業者参照
// ==========================================

// 収容規模で会場候補を絞り込んでサイドバーに表示
function openVenueSearch() {
  const html = HtmlService.createHtmlOutputFromFile('VenueSearch')
    .setTitle('会場候補を検索')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

// HTML側から呼ばれる：収容人数と会場種別で絞り込み
function searchVenues(params) {
  const capacity  = Number(params.capacity) || 0;
  const margin    = 0.2; // ±20%の余裕を持たせる
  const typeFilter = params.venueType || '';

  const venues = getAllRows(SHEET.VENUE_MASTER).filter(v => {
    const cap = Number(v['収容人数']) || 0;
    if (cap === 0) return false;

    // 規模フィルタ：指定人数の80%〜150%の会場を候補とする
    const withinRange = cap >= capacity * (1 - margin) && cap <= capacity * 1.5;
    if (!withinRange) return false;

    // 種別フィルタ
    if (typeFilter && v['会場種別'] !== typeFilter) return false;

    return true;
  });

  // 収容人数でソート
  venues.sort((a, b) => Number(a['収容人数']) - Number(b['収容人数']));

  return venues.map(v => ({
    id:          v['会場ID'],
    name:        v['会場名'],
    location:    v['所在地'],
    capacity:    v['収容人数'],
    type:        v['会場種別'],
    equipment:   v['設備メモ'],
    cost:        v['費用目安(万円/日)'],
    contact:     v['担当窓口'],
    record:      v['取引実績'],
    notes:       v['備考'],
  }));
}

// 会場種別の選択肢を返す
function getVenueTypes() {
  const types = new Set(
    getAllRows(SHEET.VENUE_MASTER).map(v => v['会場種別']).filter(Boolean)
  );
  return Array.from(types);
}

// カテゴリで業者一覧を返す（機材調達リスト入力補助）
function getVendorsByCategory(category) {
  return getAllRows(SHEET.VENDOR_MASTER)
    .filter(v => !category || v['カテゴリ'] === category)
    .map(v => ({
      id:       v['業者ID'],
      category: v['カテゴリ'],
      name:     v['社名'],
      scale:    v['対応規模(人)'],
      contact:  v['連絡先'],
      record:   v['取引実績'],
    }));
}

// 機材カテゴリ一覧を返す（ドロップダウン用）
function getEquipmentCategories() {
  return EQUIPMENT_CATEGORIES;
}

// イベントIDに紐づく機材調達リストに業者名を一括セット補助
// （機材リストを開いて業者列を手で埋める作業のサポート用）
function getEquipmentWithVendorHints(eventId) {
  const eqList = filterRows(SHEET.EQUIPMENT_LIST, { 'イベントID': eventId });
  const vendors = getAllRows(SHEET.VENDOR_MASTER);
  const eqMaster = getAllRows(SHEET.EQUIPMENT_MASTER);

  return eqList.map(eq => {
    // 機材マスタからカテゴリを特定
    const master = eqMaster.find(m => m['機材ID'] === eq['機材ID']);
    const category = master ? master['カテゴリ'] : '';

    // カテゴリに合う業者を候補として返す
    const vendorHints = vendors
      .filter(v => {
        if (!category) return false;
        // カテゴリ名が部分一致するか判定
        return v['カテゴリ'].includes(category.split('・')[0]);
      })
      .map(v => v['社名'])
      .filter(n => n && n !== '（取引先を追記）');

    return {
      equipmentId:  eq['調達ID'],
      itemName:     eq['品目名'],
      category:     category,
      currentVendor: eq['レンタル業者'],
      vendorHints:  vendorHints,
    };
  });
}
