import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { 
  FileText, 
  Trash2, 
  AlertCircle, 
  RefreshCw, 
  Calendar,
  BarChart3,
  Users,
  Download,
  Info
} from 'lucide-react';
import { getUploadedFilesMetadata, removeFileMetadata, clearAllData } from '@/utils/webStorageService';

export function LoadedFilesInfo({ onRefresh, onClearAll, canClearData = true }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [totalStats, setTotalStats] = useState({ accounts: 0, rows: 0 });
  
  // Hämta filer vid montering
  useEffect(() => {
    fetchFiles();
  }, []);
  
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const fileMetadata = await getUploadedFilesMetadata();
      console.log('Hämtade filmetadata:', fileMetadata);
      setFiles(fileMetadata);
      
      // Beräkna totalstatistik
      if (Array.isArray(fileMetadata) && fileMetadata.length > 0) {
        const uniqueAccounts = new Set();
        let totalRows = 0;
        
        fileMetadata.forEach(file => {
          // Räkna rader
          totalRows += file.rowCount || 0;
          
          // Räkna unika konton
          if (file.accountCount && file.accountCount > 0) {
            // Om vi har specifik information om konton i filen
            // Här kan vi potentiellt räkna mer noggrant om vi har info om exakt vilka konton
            for (let i = 0; i < file.accountCount; i++) {
              uniqueAccounts.add(`account_${fileMetadata.indexOf(file)}_${i}`);
            }
          }
        });
        
        setTotalStats({
          accounts: uniqueAccounts.size,
          rows: totalRows
        });
      }
    } catch (error) {
      console.error('Fel vid hämtning av filmetadata:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveFile = async (index) => {
    try {
      await removeFileMetadata(index);
      await fetchFiles();
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Fel vid borttagning av fil:', error);
    }
  };
  
  const handleClearAllData = async () => {
    if (!canClearData) return;
    
    try {
      await clearAllData();
      setFiles([]);
      setShowConfirmClear(false);
      setTotalStats({ accounts: 0, rows: 0 });
      
      if (onClearAll) {
        onClearAll();
      }
    } catch (error) {
      console.error('Fel vid rensning av data:', error);
    }
  };
  
  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('sv-SE') + ' ' + date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span>Laddar filinformation...</span>
      </div>
    );
  }
  
  if (files.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <FileText className="w-10 h-10 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">Inga filer inlästa</h3>
        <p className="text-muted-foreground">
          Importera en CSV-fil från Meta Business Suite för att komma igång.
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {showConfirmClear && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Bekräfta rensning</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Är du säker på att du vill rensa all data? Detta kommer ta bort alla uppladdade filer och statistik.
            </p>
            <div className="flex space-x-2 mt-2">
              <Button variant="outline" onClick={() => setShowConfirmClear(false)}>
                Avbryt
              </Button>
              <Button variant="destructive" onClick={handleClearAllData}>
                Ja, rensa all data
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="mb-4 bg-primary/5 p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h3 className="text-lg font-medium flex items-center">
              <Info className="w-4 h-4 mr-2" />
              Sammanfattning
            </h3>
            <div className="text-sm text-muted-foreground mt-1">
              <p>Totalt {files.length} filer importerade med {totalStats.rows} datarader.</p>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button 
              size="sm" 
              variant="outline"
              onClick={fetchFiles}
              title="Uppdatera fillista"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Uppdatera
            </Button>
            
            {canClearData && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowConfirmClear(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Rensa alla data"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Rensa alla data
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filnamn</TableHead>
              <TableHead>Uppladdad</TableHead>
              <TableHead><span className="sr-only">Period</span></TableHead>
              <TableHead className="text-right">Rader</TableHead>
              <TableHead className="text-right">Konton</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file, index) => (
              <TableRow key={index} className="hover:bg-muted/50">
                <TableCell className="font-medium flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary" />
                  <span 
                    className="truncate max-w-[200px]" 
                    title={file.originalFileName || file.filename || 'Okänd fil'}
                  >
                    {file.originalFileName || file.filename || 'Okänd fil'}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDateTime(file.uploadedAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {file.dateRange && file.dateRange.startDate && file.dateRange.endDate ? (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{file.dateRange.startDate} till {file.dateRange.endDate}</span>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <div className="flex items-center justify-end">
                    <BarChart3 className="w-3 h-3 mr-1 text-muted-foreground" />
                    <span>{file.rowCount?.toLocaleString() || '?'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <div className="flex items-center justify-end">
                    <Users className="w-3 h-3 mr-1 text-muted-foreground" />
                    <span>{typeof file.accountCount === 'number' ? file.accountCount : (file.accountCount || 0)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    title="Ta bort fil"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Ta bort</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default LoadedFilesInfo;