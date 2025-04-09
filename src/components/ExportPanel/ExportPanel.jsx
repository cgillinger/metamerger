import React, { useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, CheckCircle2, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { getPostViewData } from '../../utils/webStorageService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function ExportPanel({ dataCount, filesData, onExportComplete }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportResult, setExportResult] = useState(null);
  const [preserveFormat, setPreserveFormat] = useState(true);
  
  // Få ut datumintervallet från filerna
  const getDateRangeFromFiles = () => {
    if (!Array.isArray(filesData) || filesData.length === 0) {
      return { startDate: null, endDate: null };
    }
    
    // Hitta minsta startdatum och största slutdatum
    let startDates = [];
    let endDates = [];
    
    filesData.forEach(file => {
      if (file.dateRange) {
        if (file.dateRange.startDate) {
          startDates.push(file.dateRange.startDate);
        }
        if (file.dateRange.endDate) {
          endDates.push(file.dateRange.endDate);
        }
      }
    });
    
    if (startDates.length === 0 || endDates.length === 0) {
      // Fallback om inga datum hittades
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      return { startDate: dateString, endDate: dateString };
    }
    
    // Sortera datumen för att hitta det äldsta och nyaste
    startDates.sort();
    endDates.sort();
    
    return {
      startDate: startDates[0],
      endDate: endDates[endDates.length - 1]
    };
  };
  
  // Skapa filnamn baserat på datumperiod
  const createFileName = () => {
    const dateRange = getDateRangeFromFiles();
    let dateString = '';
    
    if (dateRange.startDate && dateRange.endDate) {
      // Formatera datum enligt önskemål (YYYY-MM-DD_YYYY-MM-DD)
      // Alternativt konvertera till önskat format
      dateString = `${dateRange.startDate}_${dateRange.endDate}`;
      
      // Ta bort eventuella otillåtna tecken i filnamn
      dateString = dateString.replace(/[/:]/g, '-');
    } else {
      // Fallback om inga datum hittades
      const today = new Date();
      dateString = today.toISOString().split('T')[0];
    }
    
    return `FB Merged ${dateString}`;
  };
  
  const formatForExport = (data) => {
    if (!preserveFormat) {
      // Enkel export utan formatkonvertering
      return data;
    }
    
    // Konvertera tillbaka data till Facebook/Meta-format för kompatibilitet
    return data.map(row => {
      const formattedRow = { ...row };
      
      // Mappa tillbaka interna fält till Facebook-specifika kolumnnamn
      if (formattedRow.account_id !== undefined) {
        formattedRow['Sid-id'] = formattedRow.account_id;
        delete formattedRow.account_id;
      }
      
      if (formattedRow.account_name !== undefined) {
        formattedRow['Sidnamn'] = formattedRow.account_name;
        delete formattedRow.account_name;
      }
      
      // VIKTIGT: Mappa description till "Beskrivning" istället för "Titel"
      if (formattedRow.description !== undefined) {
        formattedRow['Beskrivning'] = formattedRow.description;
        delete formattedRow.description;
      }
      
      // Behåll också Titel-fältet om det finns i originaldata
      if (formattedRow.title !== undefined) {
        formattedRow['Titel'] = formattedRow.title;
        delete formattedRow.title;
      }
      
      if (formattedRow.views !== undefined) {
        formattedRow['Visningar'] = formattedRow.views;
        delete formattedRow.views;
      }
      
      if (formattedRow.reach !== undefined) {
        formattedRow['Räckvidd'] = formattedRow.reach;
        delete formattedRow.reach;
      }
      
      if (formattedRow.likes !== undefined) {
        formattedRow['Reaktioner'] = formattedRow.likes;
        delete formattedRow.likes;
      }
      
      if (formattedRow.comments !== undefined) {
        formattedRow['Kommentarer'] = formattedRow.comments;
        delete formattedRow.comments;
      }
      
      if (formattedRow.shares !== undefined) {
        formattedRow['Delningar'] = formattedRow.shares;
        delete formattedRow.shares;
      }
      
      if (formattedRow.total_engagement !== undefined) {
        formattedRow['Reaktioner, kommentarer och delningar'] = formattedRow.total_engagement;
        delete formattedRow.total_engagement;
      }
      
      if (formattedRow.post_id !== undefined) {
        formattedRow['Publicerings-id'] = formattedRow.post_id;
        delete formattedRow.post_id;
      }
      
      if (formattedRow.publish_time !== undefined) {
        formattedRow['Publiceringstid'] = formattedRow.publish_time;
        delete formattedRow.publish_time;
      }
      
      if (formattedRow.post_type !== undefined) {
        formattedRow['Inläggstyp'] = formattedRow.post_type;
        delete formattedRow.post_type;
      }
      
      if (formattedRow.permalink !== undefined) {
        formattedRow['Permalänk'] = formattedRow.permalink;
        delete formattedRow.permalink;
      }
      
      if (formattedRow.total_clicks !== undefined) {
        formattedRow['Totalt antal klick'] = formattedRow.total_clicks;
        delete formattedRow.total_clicks;
      }
      
      if (formattedRow.link_clicks !== undefined) {
        formattedRow['Länkklick'] = formattedRow.link_clicks;
        delete formattedRow.link_clicks;
      }
      
      if (formattedRow.other_clicks !== undefined) {
        formattedRow['Övriga klick'] = formattedRow.other_clicks;
        delete formattedRow.other_clicks;
      }
      
      return formattedRow;
    });
  };
  
  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      setExportFormat(format);
      setExportResult(null);
      
      // Hämta all samlad data
      const data = await getPostViewData();
      
      if (!data || data.length === 0) {
        setExportResult({
          success: false,
          message: 'Ingen data att exportera. Importera minst en CSV-fil först.'
        });
        setIsExporting(false);
        return;
      }
      
      // Formatera data för export
      const formattedData = formatForExport(data);
      
      // Skapa ett filnamn baserat på datumintervall
      const fileName = createFileName();
      
      // Exportera
      if (format === 'excel') {
        await exportToExcel(formattedData, fileName);
      } else {
        await exportToCsv(formattedData, fileName);
      }
      
      // Notifiera att exporten är klar
      if (onExportComplete) onExportComplete();
      
    } catch (error) {
      console.error('Fel vid export:', error);
      setExportResult({
        success: false,
        message: `Export misslyckades: ${error.message}`
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const exportToCsv = (data, fileName) => {
    try {
      // Använd PapaParse för att konvertera data till CSV med korrekt teckenuppsättning
      const csv = Papa.unparse(data, {
        delimiter: ',',
        header: true,
        skipEmptyLines: true
      });
      
      // Lägg till BOM (Byte Order Mark) för att hjälpa Excel med UTF-8-kodning
      const csvWithBOM = "\uFEFF" + csv;
      
      // Skapa en blob och generera en downloadlink
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Rensa URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      setExportResult({
        success: true,
        message: `Exporten slutfördes framgångsrikt: ${fileName}.csv`,
        fileName: `${fileName}.csv`
      });
      
      return true;
    } catch (error) {
      console.error('Fel vid CSV-export:', error);
      throw error;
    }
  };
  
  const exportToExcel = (data, fileName) => {
    try {
      // Skapa ett nytt arbetsbok
      const workbook = XLSX.utils.book_new();
      
      // Konvertera data till ett Excel-ark
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Lägg till arket i arbetsboken
      XLSX.utils.book_append_sheet(workbook, worksheet, "Meta Data");
      
      // Generera en Excel-fil och ladda ner den
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
      
      setExportResult({
        success: true,
        message: `Exporten slutfördes framgångsrikt: ${fileName}.xlsx`,
        fileName: `${fileName}.xlsx`
      });
      
      return true;
    } catch (error) {
      console.error('Fel vid Excel-export:', error);
      throw error;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportera data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-primary/5 p-4 rounded-md border">
            <div className="flex flex-col space-y-2">
              <div className="font-medium">Exportinformation</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Antal importerade filer:</div>
                <div className="font-medium">{filesData.length}</div>
                <div className="text-muted-foreground">Totalt antal datarader:</div>
                <div className="font-medium">{dataCount}</div>
                <div className="text-muted-foreground">Filnamn kommer bli:</div>
                <div className="font-medium">{createFileName()}.csv/.xlsx</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="preserve-format" 
              checked={preserveFormat}
              onCheckedChange={setPreserveFormat}
            />
            <Label htmlFor="preserve-format">
              Exportera i Facebook-kompatibelt format (rekommenderas)
            </Label>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>
              {preserveFormat 
                ? "Exporterar data med Facebook/Meta-kolumnnamn för kompatibilitet med Facebook-appen."
                : "Exporterar data med interna kolumnnamn. Detta format kanske inte är kompatibelt med Facebook-appen."}
            </p>
          </div>
          
          {exportResult && (
            <Alert variant={exportResult.success ? "default" : "destructive"} className={exportResult.success ? "bg-green-50 border-green-200" : ""}>
              {exportResult.success 
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <AlertCircle className="h-4 w-4" />}
              <AlertDescription className={exportResult.success ? "text-green-700" : ""}>
                {exportResult.message}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex space-x-4">
            <Button
              onClick={() => handleExport('csv')}
              disabled={isExporting || dataCount === 0}
              className="flex-1"
              variant="default"
            >
              {isExporting && exportFormat === 'csv' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporterar...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportera som CSV
                </>
              )}
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              disabled={isExporting || dataCount === 0}
              variant="outline"
              className="flex-1"
            >
              {isExporting && exportFormat === 'excel' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporterar...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportera som Excel
                </>
              )}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground mt-4">
            <p>
              Den exporterade filen kommer att innehålla all data från dina importerade CSV-filer, 
              kombinerad till en enda fil. Dubbletter filtreras bort automatiskt baserat på inläggs-ID.
            </p>
            {dataCount === 0 && (
              <p className="mt-2 text-red-600">
                Ingen data tillgänglig för export. Importera minst en CSV-fil först.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}