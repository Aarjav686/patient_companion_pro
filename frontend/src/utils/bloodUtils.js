import { getLocationScore } from './locationUtils';

export const BLOOD_COMPATIBILITY_MATRIX = {
  // Key = Donor, Values = Who they can donate to
  'O-': ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], // universal donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'] // universal recipient
};

/**
 * Returns an array of compatible donor blood groups for a given recipient.
 * We invert the matrix to find who can give to the recipient.
 */
export const getCompatibleDonorGroups = (recipientGroup) => {
  const compatibleDonors = [];
  for (const [donorGroup, recipients] of Object.entries(BLOOD_COMPATIBILITY_MATRIX)) {
    if (recipients.includes(recipientGroup)) {
      compatibleDonors.push(donorGroup);
    }
  }
  return compatibleDonors;
};

/**
 * Checks if a donor is eligible to donate blood.
 * Rule 1: Age between 18 and 65.
 * Rule 2: Weight >= 50kg.
 * Rule 3: Last donation was more than 56 days ago (or never donated).
 */
export const checkEligibility = (donor) => {
  if (!donor) return { eligible: false, reason: 'No donor data', daysUntilEligible: null };
  
  if (donor.age < 18 || donor.age > 65) {
    return { eligible: false, reason: 'Age must be between 18 and 65', daysUntilEligible: null };
  }
  
  if (donor.weight < 50) {
    return { eligible: false, reason: 'Weight must be at least 50 kg', daysUntilEligible: null };
  }
  
  if (!donor.last_donation_date) {
    return { eligible: true, reason: 'Never donated', daysUntilEligible: null };
  }
  
  const lastDonation = new Date(donor.last_donation_date);
  const now = new Date();
  // Difference in days
  const diffTime = Math.abs(now - lastDonation);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays <= 56) {
    return { 
      eligible: false, 
      reason: 'Last donation was less than 56 days ago', 
      daysUntilEligible: 56 - diffDays 
    };
  }
  
  return { eligible: true, reason: '', daysUntilEligible: null };
};

/**
 * Calculates a match score between a donor and a blood request.
 * - Compatibility: Exact match (100), Compatible match (70).
 * - Eligibility: Eligible now (50), Not eligible (20).
 * - Proximity: Same city (30), Different city (0).
 */
export const calculateMatchScore = (donor, request) => {
  let score = 0;
  
  // Compatibility score
  if (donor.blood_group === request.blood_group_needed) {
    score += 100;
  } else {
    // We assume getCompatibleDonorGroups includes all compatible ones
    const compatibleGroups = getCompatibleDonorGroups(request.blood_group_needed);
    if (compatibleGroups.includes(donor.blood_group)) {
      score += 70;
    } else {
      score += 0; // Not compatible at all (should not be in the list, but just in case)
    }
  }
  
  // Eligibility score
  const eligibility = checkEligibility(donor);
  if (eligibility.eligible && donor.is_active) {
    score += 50;
  } else {
    score += 20;
  }
  
  // Proximity score using generic locationUtils module
  score += getLocationScore(donor.city, request.hospital_city);
  
  return score;
};

export const BLOOD_GROUP_COLORS = {
  'A+': 'var(--color-danger)',   // red
  'A-': 'hsl(330, 80%, 60%)',    // pink
  'B+': 'var(--color-primary)',  // blue
  'B-': 'hsl(200, 90%, 65%)',    // lightblue
  'O+': 'var(--color-success)',  // green
  'O-': 'hsl(140, 60%, 60%)',    // lightgreen
  'AB+': 'var(--color-accent)',  // purple
  'AB-': 'hsl(260, 70%, 75%)',   // lavender
};
