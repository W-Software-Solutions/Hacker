export type City = {
  name: string;
  label: string;
  coordinates: [number, number]; // [lon, lat]
};

export const cities: City[] = [
  { name: 'delhi', label: 'Delhi, India', coordinates: [77.2090, 28.6139] },
  { name: 'paris', label: 'Paris, France', coordinates: [2.3522, 48.8566] },
  { name: 'tokyo', label: 'Tokyo, Japan', coordinates: [139.6917, 35.6895] },
  { name: 'nyc', label: 'New York City, USA', coordinates: [-74.0060, 40.7128] },
  { name: 'london', label: 'London, UK', coordinates: [-0.1276, 51.5074] },
  { name: 'sydney', label: 'Sydney, Australia', coordinates: [151.2093, -33.8688] }
];

export const cityMap: Record<string, City> = Object.fromEntries(cities.map(c => [c.name, c]));
