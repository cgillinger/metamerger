import React, { useState, useEffect } from 'react';
import { FileUploader } from "./components/FileUploader";
import { LoadedFilesInfo } from "./components/LoadedFilesInfo";
import { Alert, AlertDescription } from "./components/ui/alert";
import { AlertCircle, Download, Upload, Trash2 } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { getMemoryUsageStats, clearAllData, getUploadedFilesMetadata, getPostViewData } from './utils/webStorageService';
import { MEMORY_THRESHOLDS } from './utils/memoryUtils';
import { MemoryIndicator } from './components/MemoryIndicator';
import { ExportPanel } from './components/ExportPanel';

function App() {
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [memoryWarning, setMemoryWarning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState("files");
  const [filesData, setFilesData] = useState([]);
  const [dataCount, setDataCount] = useState(0);
  
  // Rensa all befintlig data vid appstart om clearOnStart är true
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Kontrollera minnet och hämta filer
        await checkMemory();
        await loadFilesData();
        
        // Markera appen som initialiserad
        setIsInitialized(true);
      } catch (error) {
        console.error('Fel vid initialisering av app:', error);
        // Markera appen som initialiserad trots fel
        setIsInitialized(true);
      }
    };
    
    initializeApp();
  }, []); // Tom beroende-array = körs bara vid montering
  
  const loadFilesData = async () => {
    try {
      const files = await getUploadedFilesMetadata();
      setFilesData(files);
      
      // Hämta antal datarader
      const data = await getPostViewData();
      setDataCount(data?.length || 0);
    } catch (error) {
      console.error('Fel vid laddning av fildata:', error);
    }
  };
  
  // Kontrollera minnesanvändning
  const checkMemory = async () => {
    try {
      const stats = await getMemoryUsageStats();
      if (stats && parseFloat(stats.percentUsed) >= MEMORY_THRESHOLDS.WARNING) {
        setMemoryWarning(true);
      } else {
        setMemoryWarning(false);
      }
    } catch (error) {
      console.error('Fel vid kontroll av minnesanvändning:', error);
    }
  };
  
  const handleDataProcessed = async () => {
    setShowFileUploader(false);
    await checkMemory();
    await loadFilesData();
  };
  
  const handleClearAll = async () => {
    try {
      await clearAllData();
      await loadFilesData();
      await checkMemory();
    } catch (error) {
      console.error('Fel vid rensning av all data:', error);
    }
  };
  
  const handleFileChange = async () => {
    await loadFilesData();
    await checkMemory();
  };
  
  const handleExportClick = () => {
    setIsExporting(true);
    setActiveTab("export");
  };
  
  // Visa laddningsskärm tills appen är initialiserad
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Startar Meta Merger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-white shadow-sm">
        <div className="container mx-auto py-4 px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">
              Meta Merger
            </h1>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFileUploader(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Importera CSV
              </Button>
              <Button 
                onClick={handleExportClick}
                disabled={dataCount === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportera data
              </Button>
              <Button 
                variant="outline"
                onClick={handleClearAll}
                disabled={dataCount === 0}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Rensa allt
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-grow p-4">
        <div className="space-y-4">
          {/* Minnesvarning visas överst om den är aktiv */}
          {memoryWarning && (
            <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                Varning: Minnesanvändningen är hög. Du kan behöva exportera och rensa viss data innan du fortsätter.
              </AlertDescription>
            </Alert>
          )}
          
          {showFileUploader ? (
            <div className="my-4">
              <FileUploader 
                onDataProcessed={handleDataProcessed} 
                onCancel={() => setShowFileUploader(false)}
                existingData={dataCount > 0}
              />
            </div>
          ) : (
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="files">Importerade filer</TabsTrigger>
                <TabsTrigger value="memory">Minnesanvändning</TabsTrigger>
                <TabsTrigger value="export">Exportera data</TabsTrigger>
              </TabsList>
              
              <TabsContent value="files">
                <div className="space-y-4">
                  <LoadedFilesInfo 
                    onRefresh={handleFileChange}
                    onClearAll={handleClearAll}
                    canClearData={true}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="memory">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Minnesanvändning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MemoryIndicator showDetails={true} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="export">
                <ExportPanel 
                  dataCount={dataCount} 
                  filesData={filesData}
                  onExportComplete={() => setIsExporting(false)}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto py-4 px-4 text-center text-sm text-muted-foreground">
          Meta Merger © {new Date().getFullYear()} - Verktyg för sammanslagning av CSV-filer från Meta Business Suite
        </div>
      </footer>
    </div>
  );
}

export default App;