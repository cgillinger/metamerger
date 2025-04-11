/**
 * Service för hantering av kolumnmappningar
 * 
 * En robust hantering av kolumnmappningar som används för att översätta
 * externa kolumnnamn från CSV-filer till interna fältnamn i applikationen.
 * Stöd för både Facebook- och Instagram-export.
 */

console.log("columnMappingService.js - Laddar och initierar...");

// Standard kolumnmappningar - används när inga sparade mappningar finns
// Placerad här först för att undvika eventuella laddningsproblem
export const DEFAULT_MAPPINGS = {
  // Metadata (visas i PostView) - Facebook
  "Publicerings-id": "post_id",
  "Sid-id": "account_id",
  "Sidnamn": "account_name",
  "Beskrivning": "description",
  "Publiceringstid": "publish_time",
  "Inläggstyp": "post_type",
  "Permalänk": "permalink",
  
  // Mätvärden - Facebook
  "Visningar": "views",
  "Räckvidd": "reach",
  "Reaktioner, kommentarer och delningar": "total_engagement",
  "Reaktioner": "likes",
  "Kommentarer": "comments",
  "Delningar": "shares",
  "Totalt antal klick": "total_clicks",
  "Länkklick": "link_clicks",
  "Övriga klick": "other_clicks",
  
  // Metadata - Instagram
  "Inläggs-ID": "post_id",
  "Konto-ID": "account_id",
  "Kontonamn": "account_name",
  "Användarnamn": "account_username",
  "Bildtext": "description",
  "Publicerat": "publish_time",
  "Medietyp": "post_type",
  "Länk": "permalink",
  
  // Mätvärden - Instagram
  "Intryck": "views",          // Instagram använder "Intryck" istället för "Visningar"
  "Räckvidd": "reach",         // Samma för både FB och IG
  "Interaktioner totalt": "total_engagement",
  "Gilla-markeringar": "likes",
  "Kommentarer": "comments",   // Samma för både FB och IG
  "Delningar": "shares",       // Samma för både FB och IG
  "Sparade": "saves",          // Instagram-specifik
  "Profilbesök": "profile_visits", // Instagram-specifik
  "Följare": "follows",        // Instagram-specifik
  "30-sekundersvisningar": "video_30sec_views", // Instagram-specifik
  "Videospelningar": "video_plays", // Instagram-specifik
  "Genomsnittlig visningstid": "avg_video_play_time" // Instagram-specifik
};

import { readColumnMappings as getStoredMappings, saveColumnMappings as storeColumnMappings } from '../../utils/webStorageService';

// Field aliases for handling existing mappings mellan Facebook och Instagram
const FIELD_ALIASES = {
  // Facebook alias
  'page_id': 'account_id',
  'page_name': 'account_name',
  'reactions': 'likes',
  'engagement_total': 'total_engagement',
  'post_reach': 'reach',
  
  // Instagram alias
  'instagram_id': 'account_id',
  'profile_name': 'account_name',
  'username': 'account_username',
  'media_id': 'post_id',
  'media_type': 'post_type',
  'media_url': 'permalink',
  'caption': 'description',
  'timestamp': 'publish_time',
  'impressions': 'views',
  'saves': 'saves',
  'profile_visits': 'profile_visits',
  'follows': 'follows',
  'total_interactions': 'total_engagement'
};

// Beskrivande namn för användargränssnittet
export const DISPLAY_NAMES = {
  // Gemensamma
  'post_id': 'Inläggs-ID',
  'account_id': 'Konto-ID',
  'account_name': 'Kontonamn',
  'description': 'Beskrivning/Bildtext',
  'publish_time': 'Publiceringstid',
  'post_type': 'Inläggstyp',
  'permalink': 'Länk',
  'views': 'Visningar/Intryck',
  'reach': 'Räckvidd',
  'total_engagement': 'Interaktioner totalt',
  'likes': 'Gilla/Reaktioner',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  
  // Facebook-specifika
  'total_clicks': 'Totalt antal klick',
  'other_clicks': 'Övriga klick',
  'link_clicks': 'Länkklick',
  
  // Instagram-specifika
  'account_username': 'Användarnamn',
  'saves': 'Sparade',
  'profile_visits': 'Profilbesök',
  'follows': 'Nya följare',
  'video_30sec_views': '30-sekundersvisningar',
  'video_plays': 'Videospelningar',
  'avg_video_play_time': 'Genomsnittlig visningstid'
};

// Alternativa exempel på kolumnnamn för hjälp vid mappning 
// Används enbart för att visa förslag i mappningseditorn, inte för matchning
export const COLUMN_EXAMPLES = {
  // Gemensamma fält
  'views': ["Visningar", "Views", "Intryck", "Impressions"],
  'reach': ["Räckvidd", "Reach", "Audiences", "Unique users"],
  'total_engagement': ["Reaktioner, kommentarer och delningar", "Total engagement", "Interaktioner totalt", "Engagement"],
  'likes': ["Reaktioner", "Likes", "Gilla-markeringar", "Reactions", "Engagements", "Likes and reactions"],
  'comments': ["Kommentarer", "Comments"],
  'shares': ["Delningar", "Shares"],
  
  // Facebook-specifika
  'total_clicks': ["Totalt antal klick", "Total clicks", "All clicks"],
  'other_clicks': ["Övriga klick", "Other clicks"],
  'link_clicks': ["Länkklick", "Link clicks"],
  'post_id': ["Publicerings-id", "Post ID", "Inläggs-ID"],
  'account_id': ["Sid-id", "Page ID", "Konto-ID", "Account ID", "Instagram ID"],
  'account_name': ["Sidnamn", "Page name", "Account name", "Kontonamn", "Profile name"],
  'description': ["Beskrivning", "Description", "Bildtext", "Caption", "Titel", "Title"],
  'publish_time': ["Publiceringstid", "Publish time", "Datum", "Date", "Publicerat", "Timestamp"],
  'post_type': ["Inläggstyp", "Post type", "Typ", "Type", "Medietyp", "Media type"],
  'permalink': ["Permalänk", "Permanent link", "Länk", "Link", "URL", "Media URL"],
  
  // Instagram-specifika
  'account_username': ["Användarnamn", "Username", "@username", "Handle"],
  'saves': ["Sparade", "Saved", "Bookmarks", "Saves"],
  'profile_visits': ["Profilbesök", "Profile visits", "Profile views", "Profile clicks"],
  'follows': ["Följare", "Follows", "New followers", "Gained followers"],
  'video_30sec_views': ["30-sekundersvisningar", "30s views", "Video watches"],
  'video_plays': ["Videospelningar", "Video plays", "Video views"],
  'avg_video_play_time': ["Genomsnittlig visningstid", "Average video play time", "Avg. time watched"]
};

// Gruppera kolumner för bättre översikt i ColumnMappingEditor
export const COLUMN_GROUPS = {
  'Metadata': ['post_id', 'account_id', 'account_name', 'account_username', 'description', 'publish_time', 'post_type', 'permalink'],
  'Räckvidd och visningar': ['views', 'reach', 'average_reach'],
  'Engagemang': ['total_engagement', 'likes', 'comments', 'shares', 'saves', 'profile_visits', 'follows'],
  'Video': ['video_plays', 'video_30sec_views', 'avg_video_play_time'],
  'Klick (Facebook)': ['total_clicks', 'link_clicks', 'other_clicks']
};

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
    .replace(/\s+/g, ' ') // Hantera multipla mellanslag
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Ta bort osynliga tecken
}

/**
 * Kontrollerar om data ser ut att vara från Instagram istället för Facebook
 * baserat på kolumnnamn och värden
 */
export function isInstagramData(dataObject) {
  if (!dataObject) return false;
  
  console.log("isInstagramData - Kontrollerar objekt:", Object.keys(dataObject).slice(0, 10));
  
  // Instagram-specifika kolumnnamn (både svenska och engelska)
  const instagramColumns = [
    // Svenska namn
    "Användarnamn", "Konto-ID", "Kontonamn", "Medietyp", "Bildtext", 
    "Sparade", "Profilbesök", "Följare", "Intryck", "30-sekundersvisningar", 
    "Videospelningar", "Genomsnittlig visningstid",
    
    // Engelska namn
    "Username", "Account ID", "Profile Name", "Media Type", "Caption",
    "Saves", "Profile Visits", "Followers", "Impressions", "30s Views",
    "Video Plays", "Avg. Watch Time"
  ];
  
  // Kontrollera om någon Instagram-specifik kolumn finns
  for (const col of instagramColumns) {
    if (dataObject[col] !== undefined) {
      console.log("Instagram-kolumn hittad:", col);
      return true;
    }
  }
  
  // Om vi har account_username eller saves, är det sannolikt Instagram
  if (dataObject.account_username || dataObject.saves || 
      dataObject.profile_visits || dataObject.follows) {
    console.log("Instagram-specifika interna fält hittade");
    return true;
  }
  
  // Kontrollera om kolumnnamn innehåller Instagram-specifika nyckelord
  const instagramKeywords = ['saves', 'profile visit', 'follow', 'impression', 
                            'spara', 'profilbes', 'följ', 'intryck', 
                            'videospelning', 'sekundervisning', 'användarnamn'];
  
  const hasKeyword = Object.keys(dataObject).some(key => {
    const lowerKey = key.toLowerCase();
    return instagramKeywords.some(keyword => lowerKey.includes(keyword));
  });
  
  if (hasKeyword) {
    console.log("Instagram-nyckelord hittade i kolumnnamn");
    return true;
  }
  
  // Om plattformsflagga finns, använd den
  if (dataObject.platform === 'instagram') {
    return true;
  }
  
  return false;
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
  
  // Check field aliases (Facebook/Instagram compatibility)
  // Om vi söker efter ett nytt fältnamn (account_id) men data har ett gammalt (page_id)
  for (const [oldField, newField] of Object.entries(FIELD_ALIASES)) {
    if (newField === targetField && dataObject[oldField] !== undefined) {
      return dataObject[oldField];
    }
  }
  
  // Om vi söker efter ett gammalt fältnamn (page_id) men data har ett nytt (account_id)
  const alias = FIELD_ALIASES[targetField];
  if (alias && dataObject[alias] !== undefined) {
    return dataObject[alias];
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