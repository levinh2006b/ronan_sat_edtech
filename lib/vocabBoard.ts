export const VOCAB_COLUMN_COLOR_KEYS = ["sky", "mint", "lavender", "peach", "sand"] as const;
export const DEFAULT_VOCAB_COLUMN_COLOR_KEYS = VOCAB_COLUMN_COLOR_KEYS.filter((colorKey) => colorKey !== "sand");
export const MAX_VOCAB_DEFINITION_LENGTH = 500;

export type VocabColumnColorKey = (typeof VOCAB_COLUMN_COLOR_KEYS)[number];

export type VocabCard = {
  id: string;
  term: string;
  definition: string;
  audioUrl?: string;
  createdAt: string;
  sourceQuestionId?: string;
};

export type VocabColumn = {
  id: string;
  title: string;
  cardIds: string[];       // Collumn sẽ chứa id các card thuộc về nó => Phù hợp để di chuyển các card
  colorKey: VocabColumnColorKey;
};

export type VocabBoardState = {
  inboxIds: string[];
  columns: VocabColumn[];
  cards: Record<string, VocabCard>;
};

export const emptyVocabBoard: VocabBoardState = {
  inboxIds: [],
  columns: [],
  cards: {},
};

// Lọc dữ liệu nhận được từ server/cache
export function normalizeVocabBoard(raw: unknown): VocabBoardState {   // unknown là phải check là dạng gì mới được dùng
  if (!raw || typeof raw !== "object") {    // K tồn tại hoặc k phải object => Trả về bảng trống
    return emptyVocabBoard;
  }

  const maybeBoard = raw as Partial<VocabBoardState>;   // raw có thể là dữ liệu lỗi, nếu gọi raw.cards thì sẽ sặp ->  Partial<VocabBoardState> là hãy coi raw là có dạng của VocabBoardState nhưng có vài key có cũng đc, k có cũng dc (partial) và gán vào maybeBoard để xử lý
  const cardIdMap = new Map<string, string>();          // Khi lấy dữ liệu từ cache/database, data có thể bị lỗi => Phải cấp Id mới, Phải có biến này lưu lại để map từ id cũ sang id mới để tra đúng
  const usedCardIds = new Set<string>();                // List các danh sách id đã được dùng để đảm bảo k bị trùng
  const cardsEntries = maybeBoard.cards && typeof maybeBoard.cards === "object" ? Object.entries(maybeBoard.cards) : [];     // check data của các thẻ của maybeBoard có đúng dạng JSON không, không thì trả về array
                                                                                  // Object.entries biến từ object thành dạng dễ xử lý hơn
                                                                                  /**
                                                                                   *  [
                                                                                        ["phong_so_1", { "id": "vocab_99", "term": "Hello" }],
                                                                                        ["phong_so_2", { "term": "Hi" }]
                                                                                      ]
                                                                                   */
  const normalizedCards: Record<string, VocabCard> = {};         // Khởi tạo 1 bảng ánh xạ từ string -> VocabCard. string là id và VocabCard là thông tin card từ vựng, = {} nghĩa là bảng trống

  cardsEntries.forEach(([entryKey, rawCard], index) => {         // Duyệt qua danh sách các thẻ hàng dọc, bóc tách mỗi thẻ ra 3 thông tin: vd ở example trên thì lấy ra id, v1, số thứ tự (index luôn được cung cấp khi dùng foreach)
    const value = rawCard as Partial<VocabCard> | undefined;     // gán giá trị card (rawCard) vào value, có thể thiếu dữ liệu, để kiểm tra  
    const rawId = isString(value?.id) ? value.id : entryKey;     // Tìm id cũ cho card để đề phòng sau cần cấp thẻ mới
    const parsedLegacyCard = parseVocabCardValue(value);    // Gọi hàm để bóc tách thông tin ra vocab và definition
    if (!isString(rawId) || !parsedLegacyCard || !isString(value?.createdAt)) {     // Loại khi k có id, k đọc được thông tin, k có ngày tạo
      return;
    }

    //  Tạo id mới cho card, ghi vào danh bạ để sau tra cứu, đóng gói theo cấu trúc chuẩn để lưu vào hệ thống
    const nextId = makeStableUniqueId(rawId, usedCardIds, "vocab", index);    // Gọi hàm tạo id mới
    cardIdMap.set(entryKey, nextId);     // Lưu vào danh bạ -> Ai tìm entryKey hoặc rawId thì đi tìm nextId
    cardIdMap.set(rawId, nextId);        // entryKey là "phong_so_1" mà DB tự tạo khi lấy data về, rowId mới là id mà code tự tính toán ra    
    normalizedCards[nextId] = {    // Array chứa tất cả thông tin của từng card
      id: nextId,
      term: parsedLegacyCard.term,
      definition: parsedLegacyCard.definition,
      audioUrl: parsedLegacyCard.audioUrl,
      createdAt: value.createdAt,
      sourceQuestionId: isString(value.sourceQuestionId) ? value.sourceQuestionId : undefined,    // ID của nguồn gốc - bài test - đẻ ra thẻ từ vựng này
    };
  });



  // Dọn dẹp và sửa lỗi data, trả về danh sách cột sạch sẽ, an toàn
  const usedColumnIds = new Set<string>();         // Set là 1 danh sách chỉ cho phép ghi những thứ k trùng nhau
  const normalizedColumns = Array.isArray(maybeBoard.columns)    // Kiểm tra maybeBoard.columns có phải array k
    ? maybeBoard.columns
        .filter((column): column is VocabColumn => Boolean(column && typeof column === "object"))   // Lọc tất cả phần tử trong array mà k phải Object
        //   (column) -> Tham số đại diện cho từng phần tử       column is VocabColumn -> Nếu kết quả là true thì TS hãy coi kiểu data của column là VocabColumn => CÓ thể sử dụng các key của VocabColumn
        // => là arrow function, nhận đầu vào bên trái, thực thi code bên phải     
        // cần check column vì null cũng thỏa mãn là object
        .map((column, index) => {     // column được lọc ở đây là 1 Object
          const rawId = isString(column.id) ? column.id : `column-restored-${index}`;  // column nào k có id dạng string thì tạo id mới
          const nextId = makeStableUniqueId(rawId, usedColumnIds, "column", index);    // makesure id này là duy nhất
          const remappedCardIds = Array.isArray(column.cardIds)    // xử lý các cards trong column
            ? column.cardIds
                .filter(isString)    // vứt cards k có id string
                .map((cardId) => cardIdMap.get(cardId) ?? null)  // dịch từ id cũ ra id card mới, k tìm thấy trong cuốn cardIdMap thì trả về null 
                .filter((cardId): cardId is string => typeof cardId === "string" && Boolean(normalizedCards[cardId]))  // Nếu cardId dạng string và cardId có tồn tại (có ánh xạ được từ id sang data card) thì khai báo từ giờ cardId là string với TS, k bị TS báo lỗi nữa
            : [];    
          return {
            id: nextId,
            title: isString(column.title) ? column.title : "Untitled",
            cardIds: Array.from(new Set(remappedCardIds)),
            colorKey: isColorKey(column.colorKey) ? column.colorKey : DEFAULT_VOCAB_COLUMN_COLOR_KEYS[index % DEFAULT_VOCAB_COLUMN_COLOR_KEYS.length],   // Gán màu cho 1 col, nếu đã có màu thì giữ, chưa thì tự động chọn màu từ list, để đảm bảo các cột k bị trùng màu nhiều bằng cách hash index của cột ra màu
          };
        })
    : [];   //maybeBoard.columns k phải thì trả về array rỗng tránh lỗi
 

  const normalizedInboxIds = Array.isArray(maybeBoard.inboxIds)
    ? Array.from(
        new Set(
          maybeBoard.inboxIds
            .filter(isString)
            .map((cardId) => cardIdMap.get(cardId) ?? null)       // Tra cứu từ card id cũ thành mới, k thấy thì trả null
            .filter((cardId): cardId is string => typeof cardId === "string" && Boolean(normalizedCards[cardId])),   // check có card id trong arr normalizedCards không, có đúng id dạng string không
        ),
      )
    : [];

  return {
    inboxIds: normalizedInboxIds,   // return array chứa thông tin các card của ô inbox, thông tin từng col, từng card
    columns: normalizedColumns,
    cards: normalizedCards,
  };
}

export function isVocabBoardEmpty(board: VocabBoardState) {
  return board.inboxIds.length === 0 && board.columns.length === 0 && Object.keys(board.cards).length === 0;   // Trả về true khi số card trong Inbox , col, và card đều = 0
}

function isString(value: unknown): value is string {    // Hàm kiểm tra dạng có ph string k
  return typeof value === "string";
} 

// Hàm để bóc tách thông tin từ card ra vocab và definition
function parseVocabCardValue(value: Partial<VocabCard> | undefined) {
  if (!value) {   // Card rỗng
    return null;
  }

  if (isString(value.term)) {
    const term = normalizeVocabField(value.term);   // xóa khoảng trắng 
    if (!term) {
      return null;    // Toàn space thì bỏ qua
    }

    return {
      term,   // từ đã làm sạch
      definition: isString(value.definition) ? normalizeVocabDefinition(value.definition) : "",    //  làm sạch definition (định nghĩa)
      audioUrl: isString(value.audioUrl) ? value.audioUrl.trim() : undefined,    // trim audioUrl
    };
  }

  // check trong value có key nào tên text không       hãy coi value có thể có text kiểu unknown để thông báo cho TS, báo xong thì .text để lấy ra cho JS dùng isString kiểm tra
  // nếu đúng thì chắc chắn value có text dạng string => (value as { text: string }).text -> Gán type cho value và lấy text ra gán cho legacyText
  const legacyText = "text" in value && isString((value as { text?: unknown }).text) ? (value as { text: string }).text : null;
  if (!legacyText) {     // Nếu k có text trong value or text k phải string thì trả null
    return null;
  }

  
  return parseLegacyVocabText(legacyText);    // truyền value dạng chưa tách thành từ và nghĩa vào hàm này để tách
}

// Xử lý tách Vocab : Meaning
function parseLegacyVocabText(text: string) {
  const normalized = normalizeVocabField(text);   // trim
  if (!normalized) {
    return null;    // Toàn space
  }

  const separatorMatch = normalized.match(/\s*[:\uFF1A]\s*/);  // Tìm : và các space xung quanh, vd: Dog  : chó -> separatorMatch = "  : "
  if (!separatorMatch || separatorMatch.index === undefined) {    // Khi k thấy :
    return {
      term: normalized,         // Lấy toàn bộ câu làm từ, definition trống
      definition: "",
      audioUrl: undefined,
    };
  }

  // Dưới: Khi tìm thấy :

  const separatorStart = separatorMatch.index;   // Vị trí bắt đầu của separatorMatch 
  const separatorEnd = separatorStart + separatorMatch[0].length;    // Vị trí kết thúc của separatorMatch

  return {
    term: normalizeVocabField(normalized.slice(0, separatorStart)) || normalized,   // trả về term và definition
    definition: normalizeVocabDefinition(normalized.slice(separatorEnd)),
    audioUrl: undefined,
  };
}

function normalizeVocabField(value: string) {
  return value.replace(/\s+/g, " ").trim();    // Tìm những chỗ nhiều khoảng trắng liền nhau bằng space, thay thành 1 dấu cách 
}

function normalizeVocabDefinition(value: string) {
  return normalizeVocabField(value).slice(0, MAX_VOCAB_DEFINITION_LENGTH);   // Cắt cho definition k quá dài
}

function isColorKey(value: unknown): value is VocabColumnColorKey {
  return typeof value === "string" && VOCAB_COLUMN_COLOR_KEYS.includes(value as VocabColumnColorKey);   // check mã màu có trong list được cho phép không
}

function makeStableUniqueId(baseId: string, usedIds: Set<string>, prefix: string, index: number) {   // Tạo unique id
  const candidate = baseId.trim().length > 0 ? baseId : `${prefix}-restored-${index}`;
  if (!usedIds.has(candidate)) {    
    usedIds.add(candidate);
    return candidate;
  }

  let suffix = 1;
  while (usedIds.has(`${candidate}-restored-${suffix}`)) {
    suffix += 1;
  }

  const uniqueId = `${candidate}-restored-${suffix}`;
  usedIds.add(uniqueId);
  return uniqueId;
}
