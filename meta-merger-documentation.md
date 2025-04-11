# Meta Merger - Teknisk Dokumentation

## Övergripande beskrivning

Meta Merger är en webbapplikation utvecklad med React och Vite som löser ett specifikt problem: Att kombinera och hantera statistikdata (CSV-filer) från Meta-plattformar (Facebook och Instagram). Applikationen stödjer både Facebook Business Suite-exporter och Instagram Insights-exporter.

Huvudsyftet är att ge användare möjlighet att:
1. Importera flera CSV-filer från Meta-plattformar
2. Kombinera dessa data med automatisk dubbletthantering
3. Exportera den kombinerade datan i ett format som är kompatibelt med Facebook eller Instagram för vidare analys

Applikationen körs helt i webbläsaren utan serverbaserad bearbetning, vilket betyder att all datahantering sker på klientsidan med användarens lokala lagring (localStorage och IndexedDB).

## Arkitektur och Teknologier

### Kärnteknologier
- **React**: Frontend-ramverk för UI-komponenter
- **Vite**: Modern byggverktyg
- **Tailwind CSS**: Stilramverk med stöd för temahantering
- **PapaParse**: CSV-parsning
- **SheetJS (XLSX)**: Excel-filhantering
- **IndexedDB & localStorage**: Lokala lagringsmekanismer

### Huvudkomponenter
- **PlatformSelector**: Användarens inledande val mellan Facebook/Instagram
- **FileUploader**: Hantering av CSV-uppladdning och validering
- **LoadedFilesInfo**: Visar information om uppladdade filer
- **ExportPanel**: Hanterar exportformat och nedladdning
- **ColumnMappingEditor**: Editor för att anpassa kolumnmappningar mellan Meta's CSV-format och appens interna dataformat

### Dataflöde

1. **Input**: Användaren väljer plattform (Facebook/Instagram) → laddar upp en eller flera CSV-filer
2. **Bearbetning**: 
   - CSV-filerna parsas och valideras
   - Plattformen detekteras automatiskt och valideras mot användarens val
   - Kolumnerna mappas till ett internt standardformat via kolumnmappningar
   - Dubbletter identifieras och filtreras bort baserat på inläggs-ID
   - Data aggregeras per konto och per inlägg
3. **Lagring**: Data sparas i localStorage/IndexedDB
4. **Export**: Data kan exporteras till CSV eller Excel med plattformskompatibla kolumnnamn

## Plattformshantering

En central funktion i Meta Merger är stödet för både Facebook- och Instagram-data. Appen använder:

- **Tematisering**: Facebook (blått tema) vs Instagram (rosa/magenta tema)
- **Automatisk detektering**: Analyserar CSV-struktur för att identifiera källplattform
- **Plattformsspecifika kolumnmappningar**: Hanterar skillnader i terminologi mellan plattformarna
- **Separata exportformat**: Säkerställer att exporterad data är kompatibel med respektive plattforms visuella verktyg

## Minneshantering

En kritisk komponent är hanteringen av webbläsarens begränsade lagringsutrymme:
- **Avancerad minnesövervakning**: Beräknar och visar aktuell minnesanvändning
- **Dynamisk lagringsstrategi**: Använder localStorage för mindre datamängder och IndexedDB för större
- **Prediktiv lagringsbedömning**: Uppskattar hur många fler filer som kan läggas till innan lagringskapaciteten är full

## Källkodsöversikt

### Kärnfiler

| Fil | Beskrivning |
|-----|-------------|
| `src/App.jsx` | Huvudapplikationskomponent, hanterar navigering och övergripande tillstånd |
| `src/index.jsx` | Entry-point som initierar applikationen och Electron API-emulatorn |

### Komponenter

| Komponent | Fil | Beskrivning |
|-----------|-----|-------------|
| **PlatformSelector** | `src/components/PlatformSelector/PlatformSelector.jsx` | Gränssnitt för att välja mellan Facebook/Instagram |
| **FileUploader** | `src/components/FileUploader/FileUploader.jsx` | Hantering av CSV-filuppladdning med stöd för drag-and-drop och filvalidering |
| **useColumnMapper** | `src/components/FileUploader/useColumnMapper.js` | Hook för att hantera kolumnmappning vid CSV-import |
| **LoadedFilesInfo** | `src/components/LoadedFilesInfo/LoadedFilesInfo.jsx` | Visar information om uppladdade filer med alternativ för rensning |
| **MemoryIndicator** | `src/components/MemoryIndicator/MemoryIndicator.jsx` | Visar och övervakar minnesanvändning |
| **ExportPanel** | `src/components/ExportPanel/ExportPanel.jsx` | Hanterar datainställningar för export och nedladdning |
| **ColumnMappingEditor** | `src/components/ColumnMappingEditor/ColumnMappingEditor.jsx` | Editor för att anpassa mappningar mellan CSV-kolumnnamn och interna fältnamn |

### Utilities

| Utility | Fil | Beskrivning |
|---------|-----|-------------|
| **webDataProcessor** | `src/utils/webDataProcessor.js` | Central databehandlingsmodul för parsning, validering och standardisering |
| **webStorageService** | `src/utils/webStorageService.js` | Hanterar lagring och hämtning av data med localStorage/IndexedDB |
| **electronApiEmulator** | `src/utils/electronApiEmulator.js` | Emulerar Electron API för konsistent upplevelse i webbläsare |
| **memoryUtils** | `src/utils/memoryUtils.js` | Beräknar och övervakar minnesanvändning |
| **columnMappingService** | `src/components/ColumnMappingEditor/columnMappingService.js` | Hanterar mappningen mellan externa kolumnnamn och interna fält |

### UI-komponenter

| Komponent | Beskrivning |
|-----------|-------------|
| `src/components/ui/*` | Återanvändbara UI-komponenter baserade på Tailwind CSS framework |

## Datamodell

### Interna Datastrukturer

**Per-Account Data:**
```javascript
{
  account_id: "123456789",
  account_name: "ExempelSida",
  account_username: "@exempelkonto",  // Endast för Instagram
  platform: "facebook" | "instagram",
  views: 1000,
  reach: 500,
  likes: 200,
  comments: 50,
  shares: 10,
  // Plattformsspecifika fält...
}
```

**Per-Post Data:**
```javascript
{
  post_id: "123_456",
  account_id: "123456789",
  account_name: "ExempelSida",
  description: "Inläggstext...",
  publish_time: "2023-01-01T10:00:00",
  post_type: "photo",
  permalink: "https://...",
  platform: "facebook" | "instagram",
  views: 100,
  reach: 80,
  likes: 25,
  // Plattformsspecifika mätvärden...
}
```

### Filmetadata

```javascript
{
  filename: "export_01-01-2023.csv",
  originalFileName: "export_01-01-2023.csv",
  rowCount: 100,
  duplicatesRemoved: 5,
  accountCount: 3,
  dateRange: {
    startDate: "2023-01-01",
    endDate: "2023-01-31"
  },
  platform: "facebook" | "instagram"
}
```

## Nyckelalgoritmer

### 1. Plattformsdetektering

Algoritmen för att identifiera om en CSV är från Facebook eller Instagram baseras på:
- Matchning av plattformsspecifika kolumnnamn
- Identifiering av unika indikatorer som "saves", "följer", "profilbesök" för Instagram
- Viktad poängsättning där vissa indikatorer ges högre vikt

### 2. Dubbletthantering

Duplikatfiltrering sker genom:
- Primär identifiering via unikt post_id
- Fallback till JSON-serialisering av hela raden om post_id saknas
- Behållande av första förekomsten vid dubbletter

### 3. Minneshantering

Avancerad minnesövervakning med:
- Approximerad beräkning av datastorlek via JSON-serialisering
- Dynamisk uppdelning mellan localStorage och IndexedDB
- Uppskattningsalgoritm för kvarstående kapacitet

## Utmaningar och Lösningar

### 1. Plattformsskillnader

**Utmaning**: Facebook och Instagram använder olika terminologi och kolumnnamn.

**Lösning**: Adaptiv kolumnmappning och intern standardisering med plattformsspecifika exportfilter.

### 2. Webbläsarlagringsbegränsningar

**Utmaning**: Webbläsarens lokala lagring är begränsad (typiskt 5-10MB).

**Lösning**: Hybrid lagringsarchitektur med chunking-strategi och automatisk övergång till IndexedDB för större datamängder.

### 3. CSV-formatvariationer

**Utmaning**: Meta ändrar ibland kolumnnamn i exportfiler.

**Lösning**: Användarredigerbar kolumnmappning som kan anpassas när Meta ändrar format.

## Framtida Utvidgningar

1. **Visualisering**: Inbyggda diagram och grafer för direkt analys
2. **Fler plattformar**: Stöd för andra sociala medier utöver Meta's plattformar
3. **Exportfilter**: Möjlighet att filtrera och segmentera data före export
4. **Automatisk synkronisering**: Direktkoppling till Meta API för automatisk datahämtning

## Utvecklingsmiljö

```bash
# Installera beroenden
npm install

# Starta utvecklingsserver
npm run dev

# Bygg för produktion
npm run build

# Distribuera till GitHub Pages
npm run deploy
```

## Testning

För närvarande används manuell testning. Förslag för framtida implementering:
- Enhetstest med Jest
- Komponenttest med React Testing Library
- End-to-end test med Cypress

## Teknisk skuld

1. **Minnesoptimering**: Lagring kan bli mer effektiv med komprimering
2. **Testautomatisering**: Saknar automatiserade tester
3. **Kodmodularisering**: Vissa funktioner är tät kopplade och skulle gagnas av mer separation
4. **Tillgänglighetsanpassning**: Bör förbättras för skärmläsare och andra assistiva tekniker

## Slutsatser

Meta Merger är en specialiserad verktygsapp med fokus på ett specifikt arbetsflöde: kombinering av sociala mediedata från Meta-plattformar. Den utnyttjar moderna webbtekniker för att leverera en applikation som körs helt klientsidigt utan behov av server-infrastruktur.

Den viktigaste distinktionen är stödet för både Facebook och Instagram med anpassade gränssnitt och dataflöden för varje plattform, vilket gör det till ett mångsidigt verktyg för hantering av social medie-statistik.