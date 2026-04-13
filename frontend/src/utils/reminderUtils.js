// reminderUtils.js
// Parses free-text frequencies and durations into explicit time schedules

export const generateReminders = (prescriptionId, patientId, medicines) => {
  const payloads = [];
  const today = new Date();

  medicines.forEach(med => {
    // Determine frequency scalar
    const freqString = (med.frequency || '').toLowerCase();
    let timesPerDay = 1;
    let hours = [9]; // Default 9 AM

    if (freqString.includes('2') || freqString.includes('twice') || freqString.includes('1-0-1')) {
      timesPerDay = 2;
      hours = [9, 21]; // 9 AM, 9 PM
    } else if (freqString.includes('3') || freqString.includes('thrice') || freqString.includes('1-1-1')) {
      timesPerDay = 3;
      hours = [9, 14, 21]; // 9 AM, 2 PM, 9 PM
    } else if (freqString.includes('4')) {
      timesPerDay = 4;
      hours = [9, 13, 17, 21]; // 4 times
    } else if (freqString.includes('night') || freqString.includes('sleep') || freqString.includes('0-0-1')) {
      hours = [21]; // 9 PM
    }

    // Determine duration scalar
    const durString = (med.duration || '').toLowerCase();
    let days = 1;

    // simplistic parser
    const numMatch = durString.match(/\d+/);
    if (numMatch) {
      days = parseInt(numMatch[0]);
      if (durString.includes('week')) days *= 7;
      if (durString.includes('month')) days *= 30;
    } else {
      if (durString.includes('week')) days = 7;
      else if (durString.includes('month')) days = 30;
    }

    // Edge case constraints (prevent generating 10,000 rows forever)
    if (days > 180) days = 180; 

    // Generate Cartesian combinations
    for (let d = 0; d < days; d++) {
      hours.forEach(hr => {
        const schedTime = new Date(today);
        schedTime.setDate(today.getDate() + d);
        schedTime.setHours(hr, 0, 0, 0);

        payloads.push({
          patient_id: patientId,
          prescription_id: prescriptionId,
          medicine_name: med.name,
          scheduled_time: schedTime.toISOString(),
          status: 'pending'
        });
      });
    }
  });

  return payloads;
};
