// Predefined standardized cities
export const CITIES = [
  'Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad',
  'Mumbai', 'Pune', 'Navi Mumbai', 'Thane',
  'Bangalore', 'Mysore', 'Hubli',
  'Chennai', 'Vellore', 'Coimbatore',
  'Kolkata', 'Howrah',
  'Hyderabad', 'Secunderabad',
  'Ahmedabad', 'Gandhinagar', 'Surat'
];

// Predefined nearby mappings (Bidirectional relationships should be assumed, but mapped explicitly)
export const NEARBY_CITIES = {
  'Delhi': ['Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad'],
  'Gurgaon': ['Delhi', 'Faridabad'],
  'Noida': ['Delhi', 'Ghaziabad'],
  'Faridabad': ['Delhi', 'Gurgaon'],
  'Ghaziabad': ['Delhi', 'Noida'],
  
  'Mumbai': ['Navi Mumbai', 'Thane', 'Pune'],
  'Navi Mumbai': ['Mumbai', 'Thane'],
  'Thane': ['Mumbai', 'Navi Mumbai'],
  'Pune': ['Mumbai'],

  'Bangalore': ['Mysore'],
  'Mysore': ['Bangalore'],

  'Chennai': ['Vellore'],
  'Vellore': ['Chennai'],

  'Kolkata': ['Howrah'],
  'Howrah': ['Kolkata'],

  'Hyderabad': ['Secunderabad'],
  'Secunderabad': ['Hyderabad'],

  'Ahmedabad': ['Gandhinagar'],
  'Gandhinagar': ['Ahmedabad']
};

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi NCR' // often treated as state in generic forms
];

/**
 * Returns a score based on location proximity.
 * Exact city match = 30
 * Nearby city match = 15
 * No match = 0
 */
export const getLocationScore = (donorCity, requestCity) => {
  if (!donorCity || !requestCity) return 0;
  
  const dCity = donorCity.trim().toLowerCase();
  const rCity = requestCity.trim().toLowerCase();
  
  if (dCity === rCity) {
    return 30; // Exact match
  }
  
  // Normalize checking with casing (case-insensitive)
  const exactDCityKey = Object.keys(NEARBY_CITIES).find(k => k.toLowerCase() === dCity);
  const exactRCityKey = Object.keys(NEARBY_CITIES).find(k => k.toLowerCase() === rCity);

  if (exactDCityKey && NEARBY_CITIES[exactDCityKey].some(c => c.toLowerCase() === rCity)) {
    return 15; // Donor city lists Request city as nearby
  }
  
  if (exactRCityKey && NEARBY_CITIES[exactRCityKey].some(c => c.toLowerCase() === dCity)) {
    return 15; // Request city lists Donor city as nearby
  }
  
  return 0; // Not nearby
};
