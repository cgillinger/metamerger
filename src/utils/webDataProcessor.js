/**
 * Web Data Processor
 * 
 * Webbversion av Meta-plattformarnas databearbetning som använder
 * webbläsarens API:er för att hantera och bearbeta data.
 * Stöd för både Facebook- och Instagram-data.
 */
import Papa from 'papaparse';
import { 
  saveProcessedData, 
  getAccountViewData, 
  getPostViewData
} from './webStorageService';
import { 
  DEFAULT_MAPPINGS, 
  getValue, 
  normalizeText, 
  isInstagramData
} from '../components/ColumnMappingEditor/columnMappingService';

// Fältaliaser för kompatibilitet med Facebook och Instagram
const FIELD_ALIASES = {
  // Facebook alias
  'page_id': 'account_id',
  'page_name': 'account_name',
  'reactions': 'likes',
  'engagement_total': 'total_engagement',
  'post_reach': 'reach',
  'impressions': 'views',
  
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

// Direkta mappningar för Facebook-specifika kolumnnamn
const FACEBOOK_DIRECT_MAPPINGS = {
  'Sid-id': 'account_id',
  'Sidnamn': 'account_name',
  'Visningar': 'views',
  'Räckvidd': 'reach',
  'Reaktioner': 'likes',
  'Kommentarer': 'comments',
  'Delningar': 'shares',
  'Reaktioner, kommentarer och delningar': 'total_engagement',
  'Totalt antal klick': 'total_clicks',
  'Länkklick': 'link_clicks',
  'Övriga klick': 'other_clicks',
  'Publiceringstid': 'publish_time',
  'Titel': 'description',
  'Inläggstyp': 'post_type',
  'Permalänk': 'permalink',
  'Publicerings-id': 'post_id'
};

// Direkta mappningar för Instagram-specifika kolumnnamn
const INSTAGRAM_DIRECT_MAPPINGS = {
  'Konto-ID': 'account_id',
  'Kontonamn': 'account_name',
  'Användarnamn': 'account_username',
  'Inläggs-ID': 'post_id',
  'Bildtext': 'description',
  'Publicerat': 'publish_time',
  'Medietyp': 'post_type',
  'Länk': 'permalink',
  'Intryck': 'views',
  'Räckvidd': 'reach',
  'Interaktioner totalt': 'total_engagement',
  'Gilla-markeringar': 'likes',
  'Kommentarer': 'comments',
  'Delningar': 'shares',
  'Sparade': 'saves',
  'Profilbesök': 'profile_visits',
  'Följare': 'follows',
  '30-sekundersvisningar': 'video_30sec_views',
  'Videospelningar': 'video_plays',
  'Genomsnittlig visningstid': 'avg_video_play_time'
};

// Summeringsbara värden - gemensamma för båda plattformarna
const COMMON_SUMMARIZABLE_COLUMNS = [
  "views", "likes", "comments", "shares", "total_engagement", "reach"
];

// Facebook-specifika summeringsbara värden
const FACEBOOK_SUMMARIZABLE_COLUMNS = [
  ...COMMON_SUMMARIZABLE_COLUMNS,
  "total_clicks", "other_clicks", "link_clicks"
];

// Instagram-specifika summeringsbara värden
const INSTAGRAM_SUMMARIZABLE_COLUMNS = [
  ...COMMON_SUMMARIZABLE_COLUMNS,
  "saves", "profile_visits", "follows", "video_plays", "video_30sec_views"
];

// Metadata och icke-summeringsbara värden
const NON_SUMMARIZABLE_COLUMNS = [
  "post_id", "account_id", "account_name", "account_username", 
  "description", "publish_time", "date", "post_type", "permalink",
  "avg_video_play_time" // Genomsnittlig visningstid kan inte summeras direkt
];

/**
 * Formaterar datum till svenskt format (YYYY-MM-DD)
 */
function formatSwedishDate(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Fel vid datumformatering:', error);
    return '';
  }
}

/**
 * Detekterar om en CSV-fil är från Instagram baserat på kolumnnamn
 * @param {Object} firstRow - Första raden i CSV-data
 * @returns {boolean} - true om det är Instagram-data
 */
function detectDataSource(firstRow) {
  if (!firstRow) return { isInstagram: false, isFacebook: false };
  
  console.log("Detekterar datakälla från följande kolumner:", Object.keys(firstRow));
  
  // Instagram-specifika kolumner - utöka med fler kännetecken från Instagram-export
  const instagramColumns = [
    "Användarnamn", "Konto-ID", "Kontonamn", "Medietyp", "Bildtext", 
    "Sparade", "Profilbesök", "Följare", "Intryck", 
    "Videospelningar", "30-sekundersvisningar", "Genomsnittlig visningstid",
    // Engelska varianter
    "Username", "Profile Name", "Account ID", "Media Type", "Caption",
    "Saves", "Profile Visits", "New Followers", "Impressions"
  ];
  
  // Facebook-specifika kolumner
  const facebookColumns = [
    "Sid-id", "Sidnamn", "Inläggstyp", "Reaktioner", 
    "Visningar", "Totalt antal klick", "Länkklick", "Övriga klick",
    // Engelska varianter
    "Page ID", "Page Name", "Post Type", "Reactions",
    "Views", "Total Clicks", "Link Clicks"
  ];
  
  // Kontrollera Instagram-kolumner
  let instagramMatches = 0;
  let instagramMatchedColumns = [];
  for (const col of instagramColumns) {
    if (firstRow[col] !== undefined) {
      instagramMatches++;
      instagramMatchedColumns.push(col);
    }
  }
  
  // Kontrollera Facebook-kolumner
  let facebookMatches = 0;
  let facebookMatchedColumns = [];
  for (const col of facebookColumns) {
    if (firstRow[col] !== undefined) {
      facebookMatches++;
      facebookMatchedColumns.push(col);
    }
  }
  
  // Specialfall för Instagram-specifika indikatorer
  const hasInstagramIndicators = 
    Object.keys(firstRow).some(key => 
      key.includes('saves') || 
      key.includes('profile visit') || 
      key.includes('follows') || 
      key.includes('impression') ||
      key.includes('Spara') || 
      key.includes('Profilbes') || 
      key.includes('Följ') || 
      key.includes('Intryck')
    );
  
  if (hasInstagramIndicators) {
    instagramMatches += 3; // Ge extra vikt till dessa starka indikatorer
  }
  
  // Avgör plattform baserat på matchande kolumner
  const isInstagram = instagramMatches > facebookMatches || instagramMatches > 0 && facebookMatches === 0 || hasInstagramIndicators;
  const isFacebook = !isInstagram && (facebookMatches > 0 || facebookMatches > instagramMatches);
  
  console.log("Plattformsdetektering:", {
    isInstagram,
    isFacebook,
    instagramMatches,
    facebookMatches,
    matchedInstagramColumns: instagramMatchedColumns,
    matchedFacebookColumns: facebookMatchedColumns,
    hasInstagramIndicators
  });
  
  return { 
    isInstagram, 
    isFacebook,
    matchedInstagramColumns: instagramMatches,
    matchedFacebookColumns: facebookMatches,
    instagramMatchedColumns,
    facebookMatchedColumns,
    hasInstagramIndicators
  };
}

/**
 * Räknar unika konton i en datamängd
 * @param {Array} data - Datamängden att analysera
 * @param {boolean} isInstagramData - Om det är Instagram-data
 * @returns {number} - Antal unika konton
 */
function countUniqueAccounts(data, isInstagramData = false) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  
  // Använd Set för att hålla unika account_id/page_id
  const uniqueAccountIds = new Set();
  
  data.forEach(row => {
    // Anpassa kolumnnamn baserat på källa (Instagram eller Facebook)
    if (isInstagramData) {
      // Instagram-specifika kolumner
      if (row['Konto-ID'] !== undefined) {
        uniqueAccountIds.add(String(row['Konto-ID']));
        return;
      }
    } else {
      // Facebook-specifika kolumner
      if (row['Sid-id'] !== undefined) {
        uniqueAccountIds.add(String(row['Sid-id']));
        return;
      }
    }
    
    // Försök med det generella account_id/page_id-mönstret
    let accountId = getValue(row, 'account_id');
    
    // Om account_id inte finns, prova med page_id direkt för Facebook
    // eller instagram_id för Instagram
    if (!accountId) {
      if (isInstagramData && row.instagram_id) {
        accountId = row.instagram_id;
      } else if (!isInstagramData && row.page_id) {
        accountId = row.page_id;
      }
    }
    
    if (accountId) {
      uniqueAccountIds.add(String(accountId));
    }
  });
  
  return uniqueAccountIds.size || 1; // Fallback till 1 om inga konton hittas
}

/**
 * Identifierar och hanterar dubletter baserat på Post ID
 * Använder getValue för att stödja olika språk
 */
function handleDuplicates(data, columnMappings, existingData = []) {
  // Skapa en map för att hålla reda på unika post_ids
  const uniquePosts = new Map();
  const duplicateIds = new Set();
  let duplicateCount = 0;
  const totalRows = data.length + existingData.length;
  
  // Lägg först in befintliga data (om det finns)
  if (existingData && existingData.length > 0) {
    existingData.forEach(row => {
      const postId = getValue(row, 'post_id');
      
      if (postId) {
        const postIdStr = String(postId);
        uniquePosts.set(postIdStr, row);
      } else {
        // Om ingen post_id finns, använd hela raden som unik nyckel
        const rowStr = JSON.stringify(row);
        uniquePosts.set(rowStr, row);
      }
    });
  }
  
  // Gå igenom nya data och identifiera dubletter
  data.forEach(row => {
    // Använd getValue för att hitta post_id oavsett vilket språk CSV-filen är på
    const postId = getValue(row, 'post_id');
    
    if (postId) {
      const postIdStr = String(postId);
      
      if (uniquePosts.has(postIdStr)) {
        duplicateCount++;
        duplicateIds.add(postIdStr);
      } else {
        uniquePosts.set(postIdStr, row);
      }
    } else {
      // Om ingen post_id finns, använd hela raden som unik nyckel
      const rowStr = JSON.stringify(row);
      if (uniquePosts.has(rowStr)) {
        duplicateCount++;
      } else {
        uniquePosts.set(rowStr, row);
      }
    }
  });
  
  // Konvertera Map till array av unika rader
  const uniqueData = Array.from(uniquePosts.values());
  
  return {
    filteredData: uniqueData,
    stats: {
      totalRows,
      duplicates: duplicateCount,
      duplicateIds: Array.from(duplicateIds)
    }
  };
}

/**
 * Förbearbeta rad innan mappning baserat på plattform
 * @param {Object} row - Raden att förbearbeta
 * @param {boolean} isInstagramData - Om det är Instagram-data
 */
function preprocessDataRow(row, isInstagramData = false) {
  // Skapa en kopia för att inte modifiera originalet
  const processedRow = { ...row };
  
  if (isInstagramData) {
    // INSTAGRAM-SPECIFIK FÖRBEARBETNING
    
    // Om vi har Bildtext, använd den som description
    if (processedRow['Bildtext'] !== undefined) {
      processedRow['description'] = processedRow['Bildtext'];
    }
    
    // Om vi har Intryck, använd dem som views
    if (processedRow['Intryck'] !== undefined) {
      processedRow['views'] = processedRow['Intryck'];
    }
    
    // Om vi har 'Publicerat', använd det som publish_time
    if (processedRow['Publicerat'] !== undefined) {
      processedRow['publish_time'] = processedRow['Publicerat'];
    }
  } else {
    // FACEBOOK-SPECIFIK FÖRBEARBETNING
    
    // För Facebook, använd alltid Titel som description
    if (processedRow['Titel'] !== undefined) {
      processedRow['description'] = processedRow['Titel'];
    }
  }
  
  return processedRow;
}

/**
 * Mappar CSV-kolumnnamn till interna namn med hjälp av kolumnmappningar
 * @param {Object} row - Raden att mappa
 * @param {Object} columnMappings - Användarkonfigurerade kolumnmappningar
 * @param {boolean} isInstagramData - Om det är Instagram-data
 * @returns {Object} - Mappade raden
 */
function mapColumnNames(row, columnMappings, isInstagramData = false) {
  const mappedRow = {};
  
  // Förbearbeta raden baserat på datakälla
  const processedRow = preprocessDataRow(row, isInstagramData);
  
  // Bestäm vilka direkta mappningar som ska användas
  const directMappings = isInstagramData ? INSTAGRAM_DIRECT_MAPPINGS : FACEBOOK_DIRECT_MAPPINGS;
  
  // För Instagram/Facebook-data, utför plattformsspecifik direktmappning
  for (const [originalCol, internalName] of Object.entries(directMappings)) {
    if (processedRow[originalCol] !== undefined) {
      mappedRow[internalName] = processedRow[originalCol];
    }
  }
  
  // Standard mappning för övriga fält som inte fångats upp av direktmappning
  Object.entries(processedRow).forEach(([originalCol, value]) => {
    // Hoppa över fält vi redan har mappat direkt
    if (directMappings[originalCol] !== undefined && mappedRow[directMappings[originalCol]] !== undefined) {
      return;
    }
    
    // Standardmappning via konfigurerade mappningar
    const normalizedCol = normalizeText(originalCol);
    
    let internalName = null;
    for (const [mapKey, mapValue] of Object.entries(columnMappings)) {
      if (normalizeText(mapKey) === normalizedCol) {
        internalName = mapValue;
        break;
      }
    }
    
    // Om ingen mappning hittades, behåll originalkolumnen som är
    if (!internalName) {
      internalName = originalCol;
    }
    
    mappedRow[internalName] = value;
  });
  
  return mappedRow;
}

/**
 * Analyserar CSV-filen och returnerar basinformation (utan att bearbeta data)
 */
export async function analyzeCSVFile(csvContent) {
  return new Promise((resolve, reject) => {
    try {
      console.log("analyzeCSVFile - Analyserar CSV-fil...");
      
      Papa.parse(csvContent, {
        header: true,
        preview: 10, // Utöka antalet rader för bättre sampling
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            reject(new Error('Ingen data hittades i CSV-filen.'));
            return;
          }
          
          console.log("analyzeCSVFile - Första radens kolumner:", Object.keys(results.data[0]));
          
          // Uppskatta totalt antal rader (approximativt)
          const linesCount = csvContent.split('\n').length - 1; // -1 för rubrikraden
          
          // Detektera datakälla med förbättrad logik
          const dataSource = detectDataSource(results.data[0]);
          
          // Försök att detektera datakälla även från ytterligare rader för bättre noggrannhet
          if (results.data.length > 1) {
            const additionalDataSource = detectDataSource(results.data[1]);
            
            // Om den andra raden tydligare visar Instagram-indikatorer
            if (additionalDataSource.hasInstagramIndicators && !dataSource.hasInstagramIndicators) {
              console.log("analyzeCSVFile - Andra raden visade Instagram-indikatorer som inte fanns i första raden");
              dataSource.hasInstagramIndicators = true;
              // Uppdatera resultatet
              dataSource.isInstagram = true;
              dataSource.isFacebook = false;
            }
          }
          
          console.log("analyzeCSVFile - Källdetektering slutförd:", {
            isInstagram: dataSource.isInstagram,
            isFacebook: dataSource.isFacebook,
            hasInstagramIndicators: dataSource.hasInstagramIndicators
          });
          
          resolve({
            columns: Object.keys(results.data[0]).length,
            columnNames: Object.keys(results.data[0]),
            rows: linesCount,
            sampleData: results.data.slice(0, 3), // Några exempel
            fileSize: csvContent.length,
            fileSizeKB: Math.round(csvContent.length / 1024),
            isInstagramData: dataSource.isInstagram,
            isFacebookData: dataSource.isFacebook,
            dataSourceDetails: dataSource
          });
        },
        error: (error) => {
          console.error('Fel vid CSV-analys:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Oväntat fel vid analys:', error);
      reject(error);
    }
  });
}

/**
 * Bearbetar CSV-innehåll och returnerar aggregerad data
 */
export async function processPostData(csvContent, columnMappings, shouldMergeWithExisting = false, fileName = 'CSV', selectedPlatform = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // Om vi ska slå samman med befintlig data, hämta den först
      let existingPostData = [];
      let existingAccountData = [];
      
      if (shouldMergeWithExisting) {
        try {
          existingPostData = await getPostViewData() || [];
          existingAccountData = await getAccountViewData() || [];
          console.log('Befintlig data hämtad för sammanslagning:', {
            postCount: existingPostData.length,
            accountCount: existingAccountData.length
          });
        } catch (error) {
          console.warn('Kunde inte hämta befintlig data:', error);
          // Fortsätt ändå med tomma arrayer
        }
      }
      
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            reject(new Error('Ingen data hittades i CSV-filen.'));
            return;
          }
          
          // Detektera plattform automatiskt om den inte är angiven
          const dataSource = detectDataSource(results.data[0]);
          console.log("processPostData - Detekterad datakälla:", dataSource);
          
          // Om användaren valt Instagram men systemet detekterade Facebook, men det finns Instagram-indikatorer
          // Vi prioriterar användarens val och Instagram-indikatorer
          let isInstagramSource = dataSource.isInstagram;
          if (selectedPlatform === 'instagram') {
            // Ge mer vikt till användarens val när den har valt Instagram
            if (dataSource.hasInstagramIndicators || dataSource.matchedInstagramColumns > 0) {
              isInstagramSource = true;
              console.log("processPostData - Använder Instagram på grund av användarval och indikatorer");
            } else {
              isInstagramSource = true; // Fortfarande lita på användarens val
              console.log("processPostData - Använder Instagram enbart baserat på användarval");
            }
          } else if (selectedPlatform === 'facebook') {
            // Om användaren valt Facebook men filen har starka Instagram-indikatorer, visa varning
            if (dataSource.isInstagram) {
              console.warn('Varning: Filen ser ut att vara en Instagram CSV men Facebook-plattform är vald');
              // Här behåller vi isFacebook=true eftersom användaren har valt det
              isInstagramSource = false;
            } else {
              isInstagramSource = false;
            }
          } else {
            // Om inget val gjorts, använd detekteringen
            isInstagramSource = dataSource.isInstagram;
          }
          
          console.log("processPostData - Använder datakälla:", isInstagramSource ? "Instagram" : "Facebook");
          
          console.log('CSV-data analyserad:', {
            rows: results.data.length,
            columns: Object.keys(results.data[0]).length,
            platform: isInstagramSource ? 'Instagram' : 'Facebook',
            dataSource
          });
          
          // Förbearbeta data enligt plattformsspecifik logik
          let processedData = results.data;
          
          // Räkna unika konton i den nya filen INNAN sammanslagningen
          const uniqueAccountsInFile = countUniqueAccounts(processedData, isInstagramSource);
          console.log('Unika konton hittades:', uniqueAccountsInFile);
          
          // Identifiera och filtrera dubletter med tillgång till kolumnmappningar
          const { filteredData, stats } = handleDuplicates(
            processedData, 
            columnMappings,
            shouldMergeWithExisting ? existingPostData : []
          );
          
          console.log('Dubbletthantering klar:', {
            originalRows: stats.totalRows,
            filteredRows: filteredData.length,
            duplicatesRemoved: stats.duplicates
          });
          
          let perKonto = {};
          let perPost = [];
          
          // Hitta datumintervall
          let allDates = [];
          
          // Om vi sammanfogar med befintlig data, starta med den
          if (shouldMergeWithExisting && existingPostData.length > 0) {
            perPost = [...existingPostData];
            
            // Extrahera datumintervall från befintlig data
            existingPostData.forEach(post => {
              const publishDate = getValue(post, 'publish_time') || 
                                 getValue(post, 'date') || 
                                 post['Publiceringstid'] || 
                                 post['Publicerat'] ||
                                 post['Datum'];
              
              if (publishDate) {
                const date = new Date(publishDate);
                if (!isNaN(date.getTime())) {
                  allDates.push(date);
                }
              }
            });
            
            // Skapa konton från befintlig data
            existingAccountData.forEach(account => {
              const accountID = account.account_id;
              if (accountID) {
                perKonto[accountID] = { ...account };
              }
            });
          }
          
          // Välj rätt uppsättning summeringsbara kolumner baserat på plattform
          const summarizableColumns = isInstagramSource 
            ? INSTAGRAM_SUMMARIZABLE_COLUMNS 
            : FACEBOOK_SUMMARIZABLE_COLUMNS;
          
          // Bearbeta varje unik rad från nya data
          filteredData.forEach((row, index) => {
            // Hoppa över om raden redan finns i perPost (duplicate check)
            const postId = getValue(row, 'post_id');
            if (postId && perPost.some(p => getValue(p, 'post_id') === postId)) {
              return;
            }
            
            // Mappa kolumnnamn till interna namn, med plattformsspecifik logik
            const mappedRow = mapColumnNames(row, columnMappings, isInstagramSource);
            
            // Använd getValue för att få accountID för att säkerställa att vi använder rätt fält
            const accountID = getValue(mappedRow, 'account_id') || 'unknown';
            
            if (!accountID) return;
            
            // Använd getValue för att säkerställa att account_name finns
            const accountName = getValue(mappedRow, 'account_name') || 
                                (isInstagramSource ? 'Okänt Instagram-konto' : 'Okänd Facebook-sida');
            
            // Hantera account_username specifikt för Instagram
            const accountUsername = isInstagramSource 
              ? (getValue(mappedRow, 'account_username') || '')
              : '';
            
            // Samla in publiceringsdatum för datumintervall
            const publishDate = getValue(mappedRow, 'publish_time') || 
                               getValue(mappedRow, 'date') || 
                               mappedRow['Publiceringstid'] || 
                               mappedRow['Publicerat'] ||
                               mappedRow['Datum'];
            
            if (publishDate) {
              const date = new Date(publishDate);
              if (!isNaN(date.getTime())) {
                allDates.push(date);
              }
            }
            
            // Skapa konto-objekt om det inte finns
            if (!perKonto[accountID]) {
              perKonto[accountID] = { 
                "account_id": accountID,
                "account_name": accountName,
                "account_username": accountUsername,
                "platform": isInstagramSource ? 'instagram' : 'facebook'
              };
              summarizableColumns.forEach(col => perKonto[accountID][col] = 0);
            }
            
            // Lägg till plattformsflagga i rad-data
            mappedRow.platform = isInstagramSource ? 'instagram' : 'facebook';
            
            // Summera värden
            summarizableColumns.forEach(col => {
              const value = getValue(mappedRow, col);
              if (value !== null && !isNaN(parseFloat(value))) {
                perKonto[accountID][col] += parseFloat(value);
              }
            });
            
            // Spara per inlägg-data
            perPost.push(mappedRow);
          });
          
          // Beräkna datumintervall
          let dateRange = { startDate: null, endDate: null };
          
          if (allDates.length > 0) {
            const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
            
            dateRange = {
              startDate: formatSwedishDate(minDate),
              endDate: formatSwedishDate(maxDate)
            };
          }
          
          // Konvertera till arrays
          const perKontoArray = Object.values(perKonto);
          
          // Skapa filmetadataobjekt för att spåra uppladdad fil
          const fileInfo = {
            filename: fileName || 'CSV', 
            originalFileName: fileName || 'CSV',
            rowCount: results.data.length,
            duplicatesRemoved: stats.duplicates,
            accountCount: uniqueAccountsInFile,
            dateRange,
            platform: isInstagramSource ? 'instagram' : 'facebook',
            isInstagramData: isInstagramSource,
            isFacebookData: !isInstagramSource
          };
          
          // Spara data via webStorageService
          saveProcessedData(perKontoArray, perPost, fileInfo)
            .then(() => {
              console.log('Bearbetning klar! Data sparad i webbläsaren.');
              resolve({
                accountViewData: perKontoArray,
                postViewData: perPost,
                rows: perPost,
                rowCount: perPost.length,
                meta: {
                  processedAt: new Date(),
                  stats: stats,
                  dateRange: dateRange,
                  isMergedData: shouldMergeWithExisting,
                  filename: fileName,
                  platform: isInstagramSource ? 'instagram' : 'facebook'
                }
              });
            })
            .catch((error) => {
              console.error('Kunde inte spara bearbetad data:', error);
              reject(error);
            });
        },
        error: (error) => {
          console.error('Fel vid CSV-parsning:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Oväntat fel vid bearbetning:', error);
      reject(error);
    }
  });
}

/**
 * Returnerar en lista med unika sidnamn från data
 */
export function getUniquePageNames(data) {
  if (!Array.isArray(data)) return [];
  
  // Extrahera och deduplicera sidnamn
  const accountNames = new Set();
  
  data.forEach(post => {
    const accountName = getValue(post, 'account_name');
    if (accountName) {
      accountNames.add(accountName);
    }
  });
  
  return Array.from(accountNames).sort();
}

/**
 * Exportfunktioner och variabler för användning i komponenter
 */
export { 
  FACEBOOK_SUMMARIZABLE_COLUMNS, 
  INSTAGRAM_SUMMARIZABLE_COLUMNS,
  COMMON_SUMMARIZABLE_COLUMNS,
  NON_SUMMARIZABLE_COLUMNS, 
  FIELD_ALIASES,
  detectDataSource
};