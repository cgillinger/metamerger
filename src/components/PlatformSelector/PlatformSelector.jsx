import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Instagram, Facebook } from 'lucide-react';

export function PlatformSelector({ onSelect }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Välkommen till Meta Merger</h1>
        
        <p className="text-center text-muted-foreground mb-8">
          Välj vilken typ av data du vill arbeta med idag. Du kan byta plattform senare.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer facebook-card border-blue-100 hover:border-blue-300">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-blue-600">
                <Facebook className="mr-2 h-6 w-6" />
                Facebook
              </CardTitle>
              <CardDescription>
                Sammanfoga exporterade CSV-filer från Facebook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  Välj detta alternativ för att arbeta med CSV-data exporterad från 
                  Facebook Business Suite eller Facebook Insights.
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li>Kombinera data från flera Facebook-sidor</li>
                  <li>Analysera räckvidd, visningar och engagemang</li>
                  <li>Exportera samlad Facebook-statistik</li>
                </ul>
                <Button 
                  onClick={() => onSelect('facebook')} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Välj Facebook
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer instagram-card border-pink-100 hover:border-pink-300">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-fuchsia-600">
                <Instagram className="mr-2 h-6 w-6" />
                Instagram
              </CardTitle>
              <CardDescription>
                Sammanfoga exporterade CSV-filer från Instagram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  Välj detta alternativ för att arbeta med CSV-data exporterad från 
                  Instagram Insights eller Meta Business Suite.
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li>Kombinera data från flera Instagram-konton</li>
                  <li>Analysera räckvidd, intryck och interaktioner</li>
                  <li>Exportera samlad Instagram-statistik</li>
                </ul>
                <Button 
                  onClick={() => onSelect('instagram')} 
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600"
                >
                  Välj Instagram
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-8">
          Meta Merger © {new Date().getFullYear()} - Verktyg för sammanslagning av CSV-filer från Meta-plattformar
        </p>
      </div>
    </div>
  );
}

export default PlatformSelector;