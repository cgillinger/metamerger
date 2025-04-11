/**
 * Service för hantering av kolumnmappningar
 * 
 * En robust hantering av kolumnmappningar som används för att översätta
 * externa kolumnnamn från CSV-filer till interna fältnamn i applikationen.
 */
import { readColumnMappings as getStoredMappings, saveColumnMappings as storeColumnMappings } from '@/utils/webStorageService';

// Standard kolumnmappningar - används när inga sparade mappningar finns
export const DEFAULT_MAPPINGS = {
  // Metadata (visas i PostView)
  "Publicerings-id": "post_id",
  "Konto-id": "account_id",
  "Kontonamn": "account_name",
  "Kontots användarnamn": "account_username",
  "Beskrivning": "description",
  "Varaktighet (sek)": "duration_sec",
  "Publiceringstid": "publish_time",
  "Permalänk": "permalink",
  "Inläggstyp": "post_type",
  "Datum": "date",
  
  // Mätvärden
  "Visningar": "views",
  "Räckvidd": "reach",
  "Gilla-markeringar": "likes",
  "Kommentarer": "comments",
  "Delningar": "shares",
  "Sparade objekt": "saves",
  "Följer": "follows"
};

// Beskrivande namn för användargränssnittet
export const DISPLAY_NAMES = {
  'post_id': 'Post ID',
  'account_id': 'Konto-ID',
  'account_name': 'Kontonamn',
  'account_username': 'Användarnamn',
  'description': 'Beskrivning',
  'duration_sec': 'Varaktighet (sek)',
  'publish_time': 'Publiceringstid',
  'post_type': 'Inläggstyp',
  'date': 'Datum',
  'permalink': 'Permalänk',
  'views': 'Visningar',
  'reach': 'Räckvidd',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'saves': 'Sparade objekt',
  'follows': 'Följer',
  'engagement_total': 'Interaktioner',
  'engagement_total_extended': 'Totalt engagemang (alla typer)'
};

// Alternativa exempel på kolumnnamn för hjälp vid mappning 
// Används enbart för att visa förslag i mappningseditorn, inte för matchning
export const COLUMN_EXAMPLES = {
  "views": ["Visningar", "Views"],
  "reach": ["Räckvidd", "Reach"],
  "likes": ["Gilla-markeringar", "Likes"],
  "comments": ["Kommentarer", "Comments"],
  "shares": ["Delningar", "Shares"],
  "follows": ["Följer", "Följare", "Follows"],
  "saves": ["Sparade objekt", "Sparade", "Saves"],
  "post_id": ["Publicerings-id", "Inläggs-ID", "Post ID"],
  "account_id": ["Konto-id", "Konto-ID", "Account ID"],
  "account_name": ["Kontonamn", "Account name"],
  "account_username": ["Kontots användarnamn", "Användarnamn", "Username"],
  "description": ["Beskrivning", "Description", "Bildtext"],
  "duration_sec": ["Varaktighet (sek)", "Duration (sec)"],
  "publish_time": ["Publiceringstid", "Publish time", "Datum", "Date"],
  "post_type": ["Inläggstyp", "Typ", "Post type"],
  "permalink": ["Permalänk", "Länk", "Permalink", "Link"],
  "date": ["Datum", "Date"]
};

// Gruppera kolumner för bättre översikt i ColumnMappingEditor
export const COLUMN_GROUPS = {
  'Metadata': ['post_id', 'account_id', 'account_name', 'account_username', 'description', 'duration_sec', 'publish_time', 'post_type', 'permalink', 'date'],
  'Räckvidd och visningar': ['views', 'reach'],
  'Engagemang': ['engagement_total', 'engagement_total_extended', 'likes', 'comments', 'shares', 'saves', 'follows']
};

/**
 * Kontrollerar om data ser ut att vara från Instagram istället för Facebook
 * baserat på kolumnnamn och värden
 */
export function isInstagramData(dataObject) {
  if (!dataObject) return false;
  
  // Instagram-specifika kolumnnamn (både svenska och engelska)
  const instagramColumns = [
    "Användarnamn", "Konto-id", "Kontonamn", "Medietyp", "Bildtext", 
    "Sparade objekt", "Profilbesök", "Följer", "Visningar", "Varaktighet (sek)",
    "Publiceringstid", "Permalänk", "Inläggstyp", "Datum",
    // Eventuella engelska varianter
    "Username", "Account ID", "Profile Name", "Media Type", "Caption"
  ];
  
  // Kontrollera om någon Instagram-specifik kolumn finns
  for (const col of instagramColumns) {
    if (dataObject[col] !== undefined) {
      return true;
    }
  }
  
  // Om vi har account_username eller saves, är det sannolikt Instagram
  if (dataObject.account_username || dataObject.saves || 
      dataObject.profile_visits || dataObject.follows) {
    return true;
  }
  
  // Kontrollera om kolumnnamn innehåller Instagram-specifika nyckelord
  const instagramKeywords = ['saves', 'profile visit', 'follow', 'impression', 
                           'spara', 'profilbes', 'följ', 'varaktighet',
                           'kontots användarnamn'];
  
  const hasKeyword = Object.keys(dataObject).some(key => {
    const lowerKey = key.toLowerCase();
    return instagramKeywords.some(keyword => lowerKey.includes(keyword));
  });
  
  if (hasKeyword) {
    return true;
  }
  
  // Om plattformsflagga finns, använd den
  if (dataObject.platform === 'instagram') {
    return true;
  }
  
  return false;
}

// Cache för att förbättra prestanda
let cachedMappings = null;
let cachedInverseMap = null;

/**
 * Normalisera text för konsistent jämförelse
 * Tar bort extra mellanslag, konverterar till lowercase, etc.
 */
export function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFKD')  // Normalisera Unicode-tecken
    .replace(/\s+/g, ' ') // Hantera multipla mellanslag
    .replace(/[\u200B-\u200D\uFEFF\u180E\u2060\u00A0]/g, ''); // Ta bort osynliga tecken
}

/**
 * Hämtar aktuella mappningar, antingen från cache eller localStorage
 */
export function getCurrentMappings() {
  if (cachedMappings) {
    return cachedMappings;
  }

  try {
    // Vi använder synkron localStorage åtkomst direkt för att undvika async
    const storedData = localStorage.getItem('facebook_stats_column_mappings');
    if (storedData) {
      cachedMappings = JSON.parse(storedData);
    } else {
      cachedMappings = { ...DEFAULT_MAPPINGS };
    }
    
    return cachedMappings;
  } catch (error) {
    console.log('Kunde inte läsa mappningar, använder default:', error);
    cachedMappings = { ...DEFAULT_MAPPINGS };
    return cachedMappings;
  }
}

/**
 * Skapar en omvänd mappning (internt namn -> original CSV kolumnnamn)
 * Används för att hitta originalkolumnnamn från interna namn
 */
export function getInverseMappings() {
  if (cachedInverseMap) {
    return cachedInverseMap;
  }
  
  const mappings = getCurrentMappings();
  
  // Skapa en omvänd mappning (internt namn -> original CSV kolumnnamn)
  cachedInverseMap = Object.entries(mappings).reduce((acc, [original, internal]) => {
    acc[internal] = original;
    return acc;
  }, {});
  
  return cachedInverseMap;
}

/**
 * Läser kolumnmappningar från localStorage eller returnerar default
 * Denna funktion är fortfarande async för att stödja befintlig kod som använder den
 */
export async function readColumnMappings() {
  return getCurrentMappings();
}

/**
 * Sparar uppdaterade kolumnmappningar till localStorage
 */
export async function saveColumnMappings(mappings) {
  try {
    console.log('Sparar nya kolumnmappningar:', mappings);
    
    // Spara mappningar i localStorage via webStorageService
    await storeColumnMappings(mappings);
    console.log('Kolumnmappningar sparade framgångsrikt till localStorage');
    
    // Uppdatera cache med nya mappningar
    cachedMappings = mappings;
    cachedInverseMap = null; // Återställ inverse map eftersom mappningarna har ändrats
    console.log('Cache uppdaterad med nya mappningar');
    return true;
  } catch (error) {
    console.error('Fel vid sparande av kolumnmappningar:', error);
    throw new Error('Kunde inte spara kolumnmappningar');
  }
}

/**
 * Validerar att alla nödvändiga kolumner finns i CSV-data
 */
export function validateRequiredColumns(csvHeaders) {
  if (!csvHeaders || !Array.isArray(csvHeaders)) {
    console.error('Invalid csvHeaders:', csvHeaders);
    return { isValid: false, missingColumns: [] };
  }

  // Skapa set av normaliserade headers
  const normalizedHeaders = new Set(
    csvHeaders.map(header => normalizeText(header))
  );

  // Hitta saknade kolumner
  const missingColumns = Object.entries(DEFAULT_MAPPINGS)
    .filter(([originalName]) => !normalizedHeaders.has(normalizeText(originalName)))
    .map(([originalName, internalName]) => ({
      original: originalName,
      internal: internalName,
      displayName: DISPLAY_NAMES[internalName]
    }));

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
}

/**
 * Förbättrad central funktion för att hämta värden från data (SYNKRON VERSION)
 * Används av både AccountView och PostView för konsistent beteende
 */
export function getValue(dataObject, targetField) {
  // Om objektet eller fältet saknas, returnera null
  if (!dataObject || !targetField) return null;
  
  // Om värdet finns direkt på objektet, returnera det
  if (dataObject[targetField] !== undefined) {
    return dataObject[targetField];
  }
  
  // Hantera specialfall för engagement_total
  if (targetField === 'engagement_total') {
    // Beräkna summan av likes, comments och shares
    let likes = 0, comments = 0, shares = 0;
    
    // Hämta likes
    likes = getFieldValue(dataObject, 'likes') || 0;
    
    // Hämta comments
    comments = getFieldValue(dataObject, 'comments') || 0;
    
    // Hämta shares
    shares = getFieldValue(dataObject, 'shares') || 0;
    
    return likes + comments + shares;
  }
  
  // Hantera specialfall för det utökade engagemanget
  if (targetField === 'engagement_total_extended') {
    // Beräkna summan av alla engagemangsvärden
    let likes = 0, comments = 0, shares = 0, saves = 0, follows = 0;
    
    // Hämta alla engagemangsvärden
    likes = getFieldValue(dataObject, 'likes') || 0;
    comments = getFieldValue(dataObject, 'comments') || 0;
    shares = getFieldValue(dataObject, 'shares') || 0;
    saves = getFieldValue(dataObject, 'saves') || 0;
    follows = getFieldValue(dataObject, 'follows') || 0;
    
    return likes + comments + shares + saves + follows;
  }
  
  // Använd den mer generella getFieldValue för alla andra fält
  return getFieldValue(dataObject, targetField);
}

/**
 * Hjälpfunktion för att hitta värdet för ett specifikt fält i data (SYNKRON VERSION)
 * Använder enbart mappningar för att hitta värdet, inte fallback logik
 */
export function getFieldValue(dataObject, fieldName) {
  if (!dataObject) return null;
  
  // 1. Försök direkt åtkomst till fältet
  if (dataObject[fieldName] !== undefined) {
    return safeParseValue(dataObject[fieldName]);
  }
  
  // 2. Använd mappningar för att hitta originalkolumnnamnet
  const inverseMappings = getInverseMappings();
  const originalColumnName = inverseMappings[fieldName];
  
  if (originalColumnName && dataObject[originalColumnName] !== undefined) {
    return safeParseValue(dataObject[originalColumnName]);
  }
  
  // 3. Försök hitta genom normaliserade kolumnnamn
  // Detta sker enbart om inga av ovanstående matchningar lyckas
  const normalizedFieldName = normalizeText(fieldName);
  for (const [key, value] of Object.entries(dataObject)) {
    if (normalizeText(key) === normalizedFieldName) {
      return safeParseValue(value);
    }
  }
  
  // Inget värde hittat
  return null;
}

/**
 * Hjälpfunktion för att säkert tolka värden (numeriska, datum, etc.)
 */
export function safeParseValue(value) {
  if (value === null || value === undefined) return null;
  
  // Om det är ett nummer eller kan tolkas som ett
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? value : numValue;
  }
  
  return value;
}

/**
 * Formaterar värden för visning i UI
 */
export function formatValue(value) {
  if (value === null || value === undefined) return 'Saknas';
  if (value === 0) return '0';
  if (typeof value === 'number') return value.toLocaleString();
  return value || '-';
}

/**
 * Formaterar datum för visning
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
}

/**
 * Hitta matchning mellan kolumnnamn och internt namn
 * Använder enbart exakta matchningar mot kolumnmappningar
 */
export function findMatchingColumnKey(columnName, mappings) {
  if (!columnName || !mappings) return null;
  
  const normalizedColumnName = normalizeText(columnName);
  
  // Exakt matchning mot mappningar
  for (const [original, internal] of Object.entries(mappings)) {
    if (normalizeText(original) === normalizedColumnName) {
      return internal;
    }
  }
  
  // Om ingen exakt matchning hittas, returnera null
  return null;
}

/**
 * Returnerar alla kända exempel på namn för ett internt fältnamn
 * Används enbart i UI för att hjälpa användaren
 */
export function getAllKnownNamesForField(internalName) {
  const names = new Set();
  
  // Lägg till från mappningar (omvänt)
  const inverseMappings = getInverseMappings();
  if (inverseMappings[internalName]) {
    names.add(inverseMappings[internalName]);
  }
  
  // Lägg till från exempel
  if (COLUMN_EXAMPLES[internalName]) {
    COLUMN_EXAMPLES[internalName].forEach(name => names.add(name));
  }
  
  // Ta bort dupliceringar och returnera unika namn
  return [...names];
}

/**
 * Rensa cachen - användbart om vi behöver tvinga en omladdning av mappningar
 */
export function clearMappingsCache() {
  cachedMappings = null;
  cachedInverseMap = null;
}