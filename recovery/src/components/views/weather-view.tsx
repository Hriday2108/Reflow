'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudLightning, MapPin, Wind, Droplets, Eye, Thermometer, 
  RefreshCw, AlertTriangle, AlertCircle, ShieldAlert, ChevronRight, CheckCircle2,
  Plane, Train, Car, Hotel, Ticket
} from 'lucide-react';
import { Booking, BookingDependency, DisruptionType, Severity } from '@/types';
import type { SidebarView } from '@/components/sidebar';
import type { WeatherData } from '@/lib/weather/provider';
import { calculateWeatherRisk, WeatherRiskResult } from '@/lib/weather/risk';
import { cn } from '@/lib/utils';
import ItineraryGraph from '@/components/itinerary-graph';

interface WeatherViewProps {
  bookings: Booking[];
  dependencies: BookingDependency[];
  onNavigate: (view: SidebarView) => void;
}

export default function WeatherView({ bookings, dependencies, onNavigate }: WeatherViewProps) {
  // Extract unique locations from bookings
  const locations = useMemo(() => {
    const locs = bookings.map(b => b.location).filter(Boolean) as string[];
    return Array.from(new Set(locs));
  }, [bookings]);

  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0] || '');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = useCallback(async (loc: string) => {
    if (!loc) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
      if (!res.ok) throw new Error('Weather unavailable');
      const data = await res.json();
      setWeather(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Weather information is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLocation) fetchWeather(selectedLocation);
  }, [selectedLocation, fetchWeather]);

  const risk: WeatherRiskResult | null = useMemo(() => {
    if (!weather) return null;
    return calculateWeatherRisk(weather);
  }, [weather]);

  // Determine affected bookings based on location overlap
  // In a real system, we'd also check time overlap with forecast.
  const affectedBookings = useMemo(() => {
    if (!weather || !selectedLocation) return [];
    return bookings.filter(b => b.location?.toLowerCase().includes(selectedLocation.toLowerCase()));
  }, [bookings, weather, selectedLocation]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'train': return <Train className="w-4 h-4" />;
      case 'transfer': return <Car className="w-4 h-4" />;
      case 'hotel': return <Hotel className="w-4 h-4" />;
      default: return <Ticket className="w-4 h-4" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'SEVERE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MODERATE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  // Rule-based Recommendation
  const recommendation = useMemo(() => {
    if (!risk || !weather || affectedBookings.length === 0) return null;
    if (risk.level === 'LOW') return null;

    const firstAffected = affectedBookings[0];
    return {
      title: `${risk.level} RISK DETECTED`,
      description: `Expected ${risk.reason.toLowerCase()} in ${selectedLocation}. Your ${firstAffected.type} may be impacted.`,
      action: `Consider adjusting your ${firstAffected.type} schedule.`
    };
  }, [risk, weather, affectedBookings, selectedLocation]);

  return (
    <div className="h-full flex flex-col bg-background/50 overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-6 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CloudLightning className="w-6 h-6 text-primary" />
              Weather & Travel Risk
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered weather monitoring connected to your itinerary.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-card/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>Select Location</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <button
              onClick={() => fetchWeather(selectedLocation)}
              className="p-2 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        
        {error && (
          <div className="flex items-center gap-3 p-4 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/10 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-900/30">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1">
              Weather data is currently unavailable for <span className="font-semibold">{selectedLocation}</span>. 
              The system could not find a nearby weather station.
            </p>
          </div>
        )}

        {loading && !weather && !error && (
          <div className="h-64 flex flex-col items-center justify-center border border-border/30 rounded-2xl bg-card/10">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Fetching latest weather conditions...</p>
          </div>
        )}

        {!loading && !error && weather && risk && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Col: Current Weather & Forecast */}
            <div className="md:col-span-5 space-y-6">
              
              {/* CURRENT WEATHER */}
              <div className="rounded-2xl border border-border/30 bg-card/20 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-500" />
                <div className="p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Weather Now</h3>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-lg font-medium">{weather.city}</span>
                      </div>
                      <div className="text-5xl font-bold mt-2">
                        {weather.temp}°<span className="text-2xl text-muted-foreground">C</span>
                      </div>
                      <div className="text-lg font-medium mt-1 text-primary">{weather.description}</div>
                      {weather.feelsLike && (
                        <div className="text-sm text-muted-foreground mt-1">Feels like {weather.feelsLike}°C</div>
                      )}
                    </div>
                    <img src={weather.icon} alt={weather.description} className="w-24 h-24 object-contain filter drop-shadow-lg" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/20">
                    {weather.rainfall !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg"><Droplets className="w-4 h-4 text-blue-400" /></div>
                        <div>
                          <div className="text-xs text-muted-foreground">Rainfall</div>
                          <div className="font-medium text-sm">{weather.rainfall} mm/hr</div>
                        </div>
                      </div>
                    )}
                    {weather.windSpeed !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-500/10 rounded-lg"><Wind className="w-4 h-4 text-gray-400" /></div>
                        <div>
                          <div className="text-xs text-muted-foreground">Wind</div>
                          <div className="font-medium text-sm">{weather.windSpeed} km/h</div>
                        </div>
                      </div>
                    )}
                    {weather.visibility !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg"><Eye className="w-4 h-4 text-purple-400" /></div>
                        <div>
                          <div className="text-xs text-muted-foreground">Visibility</div>
                          <div className="font-medium text-sm">{weather.visibility} km</div>
                        </div>
                      </div>
                    )}
                    {weather.humidity !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-500/10 rounded-lg"><Thermometer className="w-4 h-4 text-teal-400" /></div>
                        <div>
                          <div className="text-xs text-muted-foreground">Humidity</div>
                          <div className="font-medium text-sm">{weather.humidity}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {lastUpdated && (
                    <div className="mt-6 text-[10px] text-muted-foreground text-right uppercase tracking-wider">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {/* FORECAST TIMELINE */}
              {weather.forecast && weather.forecast.length > 0 && (
                <div className="rounded-2xl border border-border/30 bg-card/20 p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Forecast Timeline</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {weather.forecast.map((pt, i) => {
                      const timeStr = new Date(pt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={i} className="flex flex-col items-center flex-shrink-0 w-16 p-2 rounded-xl bg-background/50 border border-border/30">
                          <span className="text-[10px] font-medium text-muted-foreground">{timeStr}</span>
                          <img src={pt.icon} alt={pt.description} className="w-10 h-10 my-1" />
                          <span className="text-sm font-bold">{pt.temp}°</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Right Col: Risk & Impact */}
            <div className="md:col-span-7 space-y-6">
              
              {/* TRAVEL DISRUPTION RISK */}
              <div className="rounded-2xl border border-border/30 bg-card/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Travel Disruption Risk</h3>
                  <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider", getRiskColor(risk.level))}>
                    {risk.level}
                  </span>
                </div>
                
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-4xl font-black">{risk.score}%</span>
                </div>

                <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${risk.score}%` }} 
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn(
                      "h-full", 
                      risk.level === 'SEVERE' ? 'bg-red-500' :
                      risk.level === 'HIGH' ? 'bg-orange-500' :
                      risk.level === 'MODERATE' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                  />
                </div>

                <div className="p-3 bg-background/50 rounded-lg text-sm flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong className="text-foreground font-medium">Reason:</strong> {risk.reason}
                  </p>
                </div>
              </div>

              {/* REFLOW RECOMMENDATION */}
              {recommendation && (
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                    ✦ Reflow Recommendation
                  </h3>
                  
                  <p className="text-sm text-foreground/90 mb-4 italic leading-relaxed">
                    "{recommendation.description}"
                  </p>
                  
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-4">
                    <span className="text-xs font-bold text-indigo-300 uppercase block mb-1">Recommended Action</span>
                    <span className="text-sm font-medium">{recommendation.action}</span>
                  </div>

                  <button onClick={() => onNavigate('recovery')} className="text-xs font-bold text-indigo-400 flex items-center gap-1 hover:text-indigo-300 transition-colors">
                    View Recovery Options <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* WEATHER IMPACT ON TRIP */}
              <div className="rounded-2xl border border-border/30 bg-card/20 p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Weather Impact On Your Trip</h3>
                
                {affectedBookings.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No bookings currently scheduled in {selectedLocation}.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {affectedBookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-card rounded-lg border border-border/50">
                            {getIconForType(b.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{b.title}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{b.type} • {b.start_time && !isNaN(new Date(b.start_time).getTime()) ? new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Time TBA'}</div>
                          </div>
                        </div>
                        <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", getRiskColor(risk.level))}>
                          {risk.level === 'LOW' ? 'LOW RISK' : `${risk.level} RISK`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
