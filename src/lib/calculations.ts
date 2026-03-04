// ============= Al-Ma'arij Calculation Engine =============

/**
 * Absence Score: 10 - ((10 / Total_Students) * Absent_Count)
 * Minimum 0
 */
export function calcAbsenceScore(totalStudents: number, absentCount: number): number {
  if (totalStudents === 0) return 0;
  return Math.max(0, 10 - ((10 / totalStudents) * absentCount));
}

/**
 * Uniform Score: ((Count_Grade3 + Count_Grade2) / Total_Circle_Students) * 5
 */
export function calcUniformScore(countGrade3: number, countGrade2: number, totalStudents: number): number {
  if (totalStudents === 0) return 0;
  return Math.round(((countGrade3 + countGrade2) / totalStudents) * 5 * 100) / 100;
}

/**
 * File Score: ((Count_Grade3 + Count_Grade1) / Total_Circle_Students) * 5
 */
export function calcFileScore(countGrade3: number, countGrade1: number, totalStudents: number): number {
  if (totalStudents === 0) return 0;
  return Math.round(((countGrade3 + countGrade1) / totalStudents) * 5 * 100) / 100;
}

/**
 * Early Attendance Score: weighted average based on attendance points
 * Present early = 2pts, Late = 1pt, Absent = 0
 * Score = (Total_Points / (Total_Students * 2)) * 5
 */
export function calcEarlyAttendanceScore(
  presentCount: number,
  lateCount: number,
  totalStudents: number
): number {
  if (totalStudents === 0) return 0;
  const totalPoints = (presentCount * 2) + (lateCount * 1);
  return Math.round(((totalPoints / (totalStudents * 2)) * 5) * 100) / 100;
}

/**
 * Weighted Performance Average:
 * (SUMIFS(scores) / (COUNTIFS(present) * 2)) * 5
 */
export function calcWeightedPerformance(
  totalScores: number,
  presentStudentCount: number,
  maxScorePerStudent: number = 2
): number {
  if (presentStudentCount === 0) return 0;
  return Math.round(((totalScores / (presentStudentCount * maxScorePerStudent)) * 5) * 100) / 100;
}

/**
 * Ma'arij Rewards based on track and exam %
 */
export function calcMaarijReward(track: string, examPercentage: number): number {
  if (examPercentage < 85) return 0;

  const rewards: Record<string, { mid: number; high: number }> = {
    'تمهيدي': { mid: 10, high: 15 },
    'فضي': { mid: 20, high: 30 },
    'ذهبي': { mid: 30, high: 50 },
  };

  const trackRewards = rewards[track];
  if (!trackRewards) return 0;

  if (examPercentage >= 95) return trackRewards.high;
  if (examPercentage >= 85) return trackRewards.mid;
  return 0;
}

/**
 * Distinguished Circle total for a course (60 pts max)
 * attendance(5) + absence(10) + uniform(5) + file(5) + diamond(10) + beeBuzz(10) + morals(15)
 */
export function calcDistinguishedTotal(
  attendanceScore: number,
  absenceScore: number,
  uniformScore: number,
  fileScore: number,
  diamondNecklace: number,
  beeBuzz: number,
  morals: number
): number {
  return Math.round((attendanceScore + absenceScore + uniformScore + fileScore + diamondNecklace + beeBuzz + morals) * 100) / 100;
}

/**
 * Parse uniform_file_score into separate uniform and file grades
 * 0=Neither, 1=File Only, 2=Uniform Only, 3=Both
 */
export function parseUniformFileScore(score: number): { hasUniform: boolean; hasFile: boolean } {
  return {
    hasUniform: score === 2 || score === 3,
    hasFile: score === 1 || score === 3,
  };
}
