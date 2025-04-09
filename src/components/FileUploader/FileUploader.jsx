import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { 
  UploadCloud, 
  FileWarning, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Info,
  FileText,
  FilesIcon
} from 'lucide-react';
import { handleFileUpload, getMemoryUsageStats, getUploadedFilesMetadata } from '@/utils/webStorageService';
import { processPostData, analyzeCSVFile } from '@/utils/webDataProcessor';
import { useColumnMapper } from './useColumnMapper';
import { MemoryIndicator } from '../MemoryIndicator/MemoryIndicator';
import { calculateMemoryWithNewFile } from '@/utils/memoryUtils';

export function FileUploader({ onDataProcessed, onCancel, existingData = false }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingFile, setProcessingFile] = useState(null);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [duplicateStats, setDuplicateStats] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [csvContent, setCsvContent] = useState(null);
  const [fileAnalysis, setFileAnalysis] = useState(null);
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [memoryCheck, setMemoryCheck] = useState({ canAddFile: true, status: 'safe' });
  const [existingFiles, setExistingFiles] = useState([]);
  const [possibleDuplicate, setPossibleDuplicate] = useState(null);
  const [estimatedFilesRemaining, setEstimatedFilesRemaining] = useState(null);
  const fileInputRef = useRef(null);
  const { columnMappings, validateColumns, missingColumns } = useColumnMapper();

  // Kontrollera minnesanvändning och hämta existerande filer vid montering
  useEffect(() => {
    const checkMemoryAndFiles = async () => {
      try {
        const stats = await getMemoryUsageStats();
        setMemoryUsage(stats);
        setEstimatedFilesRemaining(stats.estimatedAdditionalFiles || 0);
        
        // Hämta befintliga filer för att kontrollera dubletter
        const files = await getUploadedFilesMetadata();
        setExistingFiles(files);
      } catch (error) {
        console.error('Fel vid kontroll av minnesanvändning eller filmetadata:', error);
      }
    };
    
    checkMemoryAndFiles();
  }, []);

  // Kontrollera om filen redan finns
  const checkIfDuplicate = (selectedFile) => {
    if (!selectedFile || !existingFiles || existingFiles.length === 0) return false;
    
    const fileName = selectedFile.name;
    const duplicate = existingFiles.find(f => f.originalFileName === fileName);
    
    return duplicate;
  };

  const handleFileChange = async (event) => {
    if (event.target.files && event.target.files.length > 0) {
      // Konvertera FileList till array
      const fileArray = Array.from(event.target.files).filter(file => 
        file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
      );
      
      if (fileArray.length === 0) {
        setError('Endast CSV-filer stöds. Inga giltiga filer valdes.');
        return;
      }
      
      // Kontrollera dubbletter för alla filer
      const duplicates = fileArray.filter(file => checkIfDuplicate(file));
      
      if (duplicates.length > 0 && !existingData) {
        setPossibleDuplicate({
          files: duplicates,
          existingFile: existingFiles.find(f => f.originalFileName === duplicates[0].name)
        });
        return;
      }
      
      setFiles(fileArray);
      setError(null);
      setValidationResult(null);
      setCsvContent(null);
      setPossibleDuplicate(null);
      setTotalFiles(fileArray.length);
      
      // Analysera den första filen för minneshantering
      try {
        setIsLoading(true);
        
        // Endast analyser den första filen för att uppskatta minnesanvändning
        const firstFile = fileArray[0];
        const content = await handleFileUpload(firstFile);
        
        const analysis = await analyzeCSVFile(content);
        setFileAnalysis(analysis);
        
        // Uppskatta minnesbehov baserat på alla filer
        if (memoryUsage) {
          // Grov uppskattning av total storlek baserat på första filens storlek * antal filer
          const totalEstimatedRows = analysis.rows * fileArray.length;
          const totalEstimatedColumns = analysis.columns;
          
          const projection = calculateMemoryWithNewFile(
            { rows: totalEstimatedRows, columns: totalEstimatedColumns }, 
            memoryUsage
          );
          
          setMemoryCheck(projection);
          
          if (projection.status === 'critical') {
            setError('Varning: Minnesanvändningen kommer vara kritisk om dessa filer läses in. Rensa data först.');
          }
          
          // Uppdatera uppskattningen av återstående filer
          setEstimatedFilesRemaining(projection.estimatedRemainingFiles || 0);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Fel vid filanalys:', error);
        setIsLoading(false);
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      // Simulera filvalshändelse genom att anropa handleFileChange med ett objekt
      handleFileChange({ target: { files: event.dataTransfer.files } });
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFile = async (file, index) => {
    try {
      setProcessingFile(file.name);
      
      // Läs filinnehåll
      const content = await handleFileUpload(file);
      
      // Validera kolumner först
      let validation;
      try {
        validation = validateColumns(content);
        
        if (!validation.isValid && validation.missing && validation.missing.length > 0) {
          console.log(`Validering misslyckades för ${file.name}:`, validation);
          // Fortsätt ändå - vi ber inte användaren bekräfta för varje fil
        }
      } catch (validationError) {
        console.error(`Validering misslyckades för ${file.name}:`, validationError);
      }
      
      // Bearbeta data med rätt flagga för sammanslagning
      // Använd alltid sammanslagning förutom för första filen när isNewAnalysis är true
      const shouldMergeWithExisting = existingData || index > 0;
      
      const processedData = await processPostData(
        content, 
        columnMappings, 
        shouldMergeWithExisting,
        file.name
      );
      
      if (processedData.meta?.stats?.duplicates > 0) {
        // Uppdatera total dublettstatistik
        setDuplicateStats(prev => {
          const prevDuplicates = prev ? prev.duplicates : 0;
          const prevTotalRows = prev ? prev.totalRows : 0;
          
          return {
            duplicates: prevDuplicates + processedData.meta.stats.duplicates,
            totalRows: prevTotalRows + (processedData.meta.stats.totalRows || processedData.rows.length + processedData.meta.stats.duplicates)
          };
        });
      }
      
      // Öka antalet bearbetade filer
      setProcessedFiles(prev => prev + 1);
      
      return processedData;
    } catch (error) {
      console.error(`Fel vid bearbetning av ${file.name}:`, error);
      throw error;
    }
  };

  const processAllFiles = async () => {
    if (files.length === 0) {
      setError('Inga filer valda');
      return;
    }

    // Kontrollera om minnesanvändningen är kritisk
    if (memoryCheck && memoryCheck.status === 'critical' && !memoryCheck.canAddFile) {
      setError('Kan inte lägga till mer data: Minnesanvändningen skulle bli för hög. Rensa befintlig data först.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDuplicateStats(null);
    setValidationResult(null);
    setProcessedFiles(0);
    setTotalFiles(files.length);

    try {
      let finalProcessedData = null;
      
      // Bearbeta filerna i sekvens
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await processFile(file, i);
        finalProcessedData = data;
      }
      
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        
        if (finalProcessedData) {
          onDataProcessed(finalProcessedData);
        }
      }, 1500);
    } catch (err) {
      console.error('Fel vid bearbetning:', err);
      setError(`Fel vid bearbetning: ${err.message}`);
    } finally {
      setIsLoading(false);
      setProcessingFile(null);
    }
  };
  
  const handleContinueDespiteWarning = () => {
    if (possibleDuplicate) {
      // Om det finns flera dubblettfiler, lägg till dem ändå
      setFiles(possibleDuplicate.files);
      setPossibleDuplicate(null);
      
      // Utför filanalys direkt
      const analyzeUploadedFiles = async () => {
        try {
          setIsLoading(true);
          
          // Endast analyser den första filen för att uppskatta minnesanvändning
          const firstFile = possibleDuplicate.files[0];
          const content = await handleFileUpload(firstFile);
          
          const analysis = await analyzeCSVFile(content);
          setFileAnalysis(analysis);
          
          if (memoryUsage) {
            // Grov uppskattning baserat på filerna
            const totalEstimatedRows = analysis.rows * possibleDuplicate.files.length;
            const projection = calculateMemoryWithNewFile(
              { rows: totalEstimatedRows, columns: analysis.columns }, 
              memoryUsage
            );
            setMemoryCheck(projection);
            setEstimatedFilesRemaining(projection.estimatedRemainingFiles || 0);
          }
          
          setIsLoading(false);
          setTotalFiles(possibleDuplicate.files.length);
        } catch (error) {
          console.error('Fel vid filanalys:', error);
          setIsLoading(false);
        }
      };
      
      analyzeUploadedFiles();
    }
  };
  
  const handleCancelDuplicateUpload = () => {
    setPossibleDuplicate(null);
    setFiles([]);
    
    // Säkerställ att fileInputRef.current finns innan vi sätter value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMemoryUpdate = (stats) => {
    setMemoryUsage(stats);
    setEstimatedFilesRemaining(stats.estimatedAdditionalFiles || 0);
    
    // Uppdatera minnesprojektion om det finns en fil
    if (fileAnalysis && files.length > 0) {
      const totalEstimatedRows = fileAnalysis.rows * files.length;
      const projection = calculateMemoryWithNewFile(
        { rows: totalEstimatedRows, columns: fileAnalysis.columns }, 
        stats
      );
      setMemoryCheck(projection);
      
      // Uppdatera uppskattningen av återstående filer efter denna fil
      if (projection && typeof projection.estimatedRemainingFiles !== 'undefined') {
        setEstimatedFilesRemaining(projection.estimatedRemainingFiles);
      }
    }
  };
  
  // Visa varning om möjlig dublett
  if (possibleDuplicate) {
    return (
      <div className="space-y-4">
        <Alert className="bg-yellow-50 border-yellow-200">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Möjliga dubblettfiler</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <p className="mb-2">
              Det verkar som att du redan har lagt till {possibleDuplicate.files.length > 1 ? 'filer' : 'en fil'} med samma namn. Är du säker på att du vill fortsätta?
            </p>
            <div className="bg-white p-3 rounded-md border border-yellow-300 mb-4">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <span className="font-semibold">Dubblettfiler:</span>
                {possibleDuplicate.files.map((file, index) => (
                  <div key={index} className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-yellow-500" />
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                onClick={handleCancelDuplicateUpload}
              >
                Avbryt
              </Button>
              <Button 
                onClick={handleContinueDespiteWarning}
              >
                Fortsätt ändå
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Minnesindikator som visas om vi lägger till ny data */}
      {existingData && (
        <MemoryIndicator onUpdate={handleMemoryUpdate} />
      )}
      
      {validationResult && !validationResult.isValid && validationResult.missing && validationResult.missing.length > 0 && (
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Fel vid validering av CSV</AlertTitle>
          <AlertDescription>
            <p>Filen saknar nödvändiga kolumner:</p>
            <ul className="mt-2 list-disc list-inside">
              {validationResult.missing.map((col) => (
                <li key={col.internal || Math.random().toString()}>
                  <span className="font-semibold">{col.displayName || col.original || 'Okänd kolumn'}</span> (förväntat namn: {col.original || 'N/A'})
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Uppdatera kolumnmappningarna via "Hantera kolumnmappningar" om Meta har ändrat kolumnnamnen.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {showSuccessMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Bearbetning slutförd</AlertTitle>
          <AlertDescription className="text-green-700">
            {duplicateStats && duplicateStats.duplicates > 0 ? 
              `${duplicateStats.duplicates} dubletter har filtrerats bort av ${duplicateStats.totalRows} rader.` : 
              files.length > 1 ? 
                `${files.length} CSV-filer har bearbetats framgångsrikt!` : 
                "CSV-data har bearbetats framgångsrikt!"}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">
            {existingData 
              ? 'Lägg till fler CSV-filer'
              : 'Importera CSV från Meta Business Suite'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {existingData && memoryCheck.status === 'critical' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Minnesbegränsning</AlertTitle>
              <AlertDescription>
                Systemet har inte tillräckligt med minne för att lägga till mer data. 
                Rensa befintlig data innan du fortsätter.
              </AlertDescription>
            </Alert>
          )}
          
          {existingData && memoryCheck.status === 'warning' && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Minnesvarning</AlertTitle>
              <AlertDescription className="text-yellow-700">
                <div className="space-y-1">
                  <p>Att lägga till dessa filer kommer använda {memoryCheck.projectedPercent}% av tillgängligt minne.</p>
                  
                  {files.length > 0 && estimatedFilesRemaining !== null && (
                    <p className="font-medium">
                      Efter dessa filer kommer du kunna lägga till ungefär {estimatedFilesRemaining} file{estimatedFilesRemaining !== 1 ? 'r' : ''} till.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div 
            className={`
              border-2 border-dashed rounded-lg p-12 
              ${files.length > 0 ? 'border-primary bg-primary/5' : 'border-border'} 
              text-center cursor-pointer transition-colors
              ${memoryCheck.status === 'critical' && !memoryCheck.canAddFile ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={memoryCheck.canAddFile ? handleBrowseClick : undefined}
          >
            <input
              type="file"
              accept=".csv"
              multiple  // Nu kan användaren välja flera filer samtidigt
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={memoryCheck.status === 'critical' && !memoryCheck.canAddFile}
            />
            
            <div className="flex flex-col items-center justify-center space-y-4">
              {memoryCheck.status === 'critical' && !memoryCheck.canAddFile ? (
                <AlertCircle className="w-12 h-12 text-red-500" />
              ) : files.length > 0 ? (
                <FilesIcon className="w-12 h-12 text-primary" />
              ) : (
                <UploadCloud className="w-12 h-12 text-muted-foreground" />
              )}
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {memoryCheck.status === 'critical' && !memoryCheck.canAddFile 
                    ? 'Kan inte lägga till mer data - Minnet är fullt' 
                    : files.length > 0 
                      ? `${files.length} fil${files.length > 1 ? 'er' : ''} valda`
                      : 'Släpp CSV-filer här eller klicka för att välja filer'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {memoryCheck.status === 'critical' && !memoryCheck.canAddFile 
                    ? 'Du behöver rensa befintlig data innan du kan lägga till mer' 
                    : 'Du kan välja flera CSV-filer samtidigt. Filerna kommer att kombineras i den ordning de väljs.'}
                </p>
                
                {files.length > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="max-h-32 overflow-y-auto text-left border rounded p-2 bg-white/50">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center py-1">
                          <FileText className="w-4 h-4 mr-2 text-primary" />
                          <span className="text-primary">{file.name}</span>
                        </div>
                      ))}
                    </div>
                    
                    {fileAnalysis && (
                      <div className="mt-2 text-primary">
                        <p>Uppskattad total storlek: {Math.round((fileAnalysis.fileSize * files.length) / 1024)} KB</p>
                        <p>Uppskattade rader: ~{fileAnalysis.rows * files.length}</p>
                        
                        {/* Uppskattning av återstående kapacitet */}
                        {estimatedFilesRemaining !== null && (
                          <p className="mt-1 font-medium">
                            Efter dessa filer kommer du kunna lägga till ungefär {estimatedFilesRemaining} file{estimatedFilesRemaining !== 1 ? 'r' : ''} till
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel vid inläsning</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Avbryt
            </Button>
            <Button 
              onClick={processAllFiles}
              disabled={files.length === 0 || isLoading || (memoryCheck.status === 'critical' && !memoryCheck.canAddFile)}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {processingFile ? (
                    <>Bearbetar {processedFiles+1}/{totalFiles}: {processingFile}</>
                  ) : (
                    <>Bearbetar...</>
                  )}
                </>
              ) : existingData 
                  ? "Lägg till data" 
                  : "Importera"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}