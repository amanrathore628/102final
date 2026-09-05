import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Layers, Search, Filter, Eye, ChevronRight, TrendingUp, AlertTriangle, Globe, Compass, ShieldAlert } from 'lucide-react';
import { getGeoDistricts } from '../services/api';
import { formatINR } from '../utils/formatters';
import { GeoDistrict } from '../types';
import L from 'leaflet';

interface GeographicIntelligenceProps {
  onNavigate: (route: string) => void;
}

export const GeographicIntelligence: React.FC<GeographicIntelligenceProps> = ({ onNavigate }) => {
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [top5, setTop5] = useState<GeoDistrict[]>([]);
  const [activeLayer, setActiveLayer] = useState('Risk Score');
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedDistrict, setSelectedDistrict] = useState<GeoDistrict | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getGeoDistricts(activeLayer, selectedState !== 'All India' ? selectedState : undefined);
        setDistricts(data.districts || []);
        setTop5(data.top_5_high_risk || []);
        if (data.districts?.length > 0 && !selectedDistrict) {
          setSelectedDistrict(data.districts[0]);
        }
      } catch (err) {
        console.error('Failed to load geo data:', err);
      }
    }
    load();
  }, [activeLayer, selectedState]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center of India coordinates [22.5, 79.0]
      const map = L.map(mapContainerRef.current, {
        center: [23.5, 80.0],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();

    districts.forEach((d) => {
      const isSelected = selectedDistrict?.id === d.id;
      const color = d.risk_score >= 80 ? '#EF4444' : d.risk_score >= 50 ? '#F59E0B' : '#10B981';

      // Custom pulsing HTML marker
      const customIcon = L.divIcon({
        className: 'custom-geo-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="
              width: ${isSelected ? '38px' : '30px'};
              height: ${isSelected ? '38px' : '30px'};
              background: ${color};
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-weight: 900;
              font-size: ${isSelected ? '12px' : '11px'};
              font-family: sans-serif;
              transition: all 0.2s ease;
            ">
              ${d.risk_score}
            </div>
            ${d.risk_score >= 80 ? `
              <div style="
                position: absolute;
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background: rgba(239, 68, 68, 0.35);
                animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                pointer-events: none;
              "></div>
            ` : ''}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([d.lat, d.lng], { icon: customIcon });
      marker.on('click', () => {
        setSelectedDistrict(d);
        map.flyTo([d.lat, d.lng], 7, { duration: 0.8 });
      });

      // Also add circle radius layer
      const circle = L.circle([d.lat, d.lng], {
        radius: (d.total_expenditure_cr || 1000) * 15,
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
      });

      markers.addLayer(circle);
      markers.addLayer(marker);
    });

    if (selectedDistrict) {
      map.panTo([selectedDistrict.lat, selectedDistrict.lng]);
    }
  }, [districts, selectedDistrict]);

  const layers = [
    'Risk Score',
    'Expenditure',
    'Utilization',
    'Duplicate Works',
    'Vendor Concentration',
    'Delayed Works',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Geographic Intelligence</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">District-level spatial risk clustering and multi-signal geographic monitoring</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All India">All States</option>
            <option value="Bihar">Bihar</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Maharashtra">Maharashtra</option>
          </select>
        </div>
      </div>

      {/* Main Map & Top 5 Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Leaflet GIS Visualizer */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative min-h-[520px]">
          {/* Layer Selector Overlay */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3 z-10">
            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Layer:</span>
            </span>
            {layers.map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shadow-sm ${
                  activeLayer === layer
                    ? 'bg-blue-600 text-white shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>

          {/* Leaflet Map Canvas */}
          <div className="flex-1 w-full rounded-xl overflow-hidden border border-slate-200 relative min-h-[440px]">
            <div ref={mapContainerRef} className="w-full h-full min-h-[440px]" />

            {/* Selected District Floating Tooltip */}
            {selectedDistrict && (
              <div className="absolute right-4 top-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-2xl w-72 text-xs z-[1000] space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedDistrict.district_name}</h4>
                    <span className="text-[11px] text-slate-500">{selectedDistrict.state_name}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-white text-[11px] font-black shadow-sm ${
                    selectedDistrict.risk_score >= 80 ? 'bg-red-600' : 'bg-amber-500'
                  }`}>
                    {selectedDistrict.risk_score} Risk
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 pt-1">
                  <div className="flex justify-between">
                    <span>Total Sanctioned Works:</span> <strong className="text-slate-900">{selectedDistrict.total_works}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenditure:</span> <strong className="text-slate-900 font-mono">₹{selectedDistrict.total_expenditure_cr} Cr</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>High Risk Anomaly Works:</span> <strong className="text-red-600 font-bold">{selectedDistrict.high_risk_works}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Fund Utilization Rate:</span> <strong className="text-emerald-700">{selectedDistrict.utilization_pct}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Primary Alert Signal:</span> <strong className="text-blue-700 font-bold">{selectedDistrict.top_signal}</strong>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate(`/works?district=${encodeURIComponent(selectedDistrict.district_name)}`)}
                  className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Inspect District Portfolio</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top 5 High-Risk Districts */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Top 5 High-Risk Districts</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Real-Time Risk</span>
          </div>

          <div className="space-y-2.5">
            {top5.map((d, idx) => (
              <div
                key={d.id}
                onClick={() => {
                  setSelectedDistrict(d);
                  mapInstanceRef.current?.flyTo([d.lat, d.lng], 7);
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedDistrict?.id === d.id
                    ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/20 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/90'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{d.district_name}</div>
                      <div className="text-[10px] text-slate-500">{d.state_name}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-rose-600 font-mono">{d.risk_score}</span>
                    <div className="text-[9px] text-slate-400 font-medium">{d.high_risk_works} high-risk works</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">District Implementation & Risk Comparison</h3>
          <span className="text-xs text-slate-400 font-mono">Live Geospatial Aggregates</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">District</th>
                <th className="py-2.5 px-3.5">State</th>
                <th className="py-2.5 px-3.5 text-center">Total Works</th>
                <th className="py-2.5 px-3.5 text-right">Expenditure</th>
                <th className="py-2.5 px-3.5 text-center">Utilization</th>
                <th className="py-2.5 px-3.5 text-center">Flagged Works</th>
                <th className="py-2.5 px-3.5 text-center">Avg Risk Score</th>
                <th className="py-2.5 px-3.5">Primary Anomaly Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {districts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-bold text-slate-900">{d.district_name}</td>
                  <td className="py-3 px-3.5 text-slate-600">{d.state_name}</td>
                  <td className="py-3 px-3.5 text-center text-slate-700">{d.total_works}</td>
                  <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900">₹{d.total_expenditure_cr} Cr</td>
                  <td className="py-3 px-3.5 text-center text-emerald-700 font-bold">{d.utilization_pct}%</td>
                  <td className="py-3 px-3.5 text-center text-amber-700 font-bold">{d.flagged_works}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm ${
                      d.risk_score >= 80 ? 'bg-red-600' : 'bg-amber-500'
                    }`}>
                      {d.risk_score}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-blue-700 font-semibold">{d.top_signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
