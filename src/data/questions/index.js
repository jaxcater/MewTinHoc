import { CHUONG_1_QUIZ } from './chuong1.js';
import { CHUONG_2_QUIZ } from './chuong2.js';
import { CHUONG_3_QUIZ } from './chuong3.js';
import { CHUONG_4_QUIZ } from './chuong4.js';
import { CHUONG_5_QUIZ } from './chuong5.js';
import { CHUONG_6_QUIZ } from './chuong6.js';
import { CHUONG_CS1_QUIZ } from './chuongCS1.js';
import { CHUONG_ICT1_QUIZ } from './chuongICT1.js';
import { CHUONG_ICT2_QUIZ } from './chuongICT2.js';
import { CHUONG_CS2_QUIZ } from './chuongCS2.js';
import { CHUONG_7_QUIZ } from './chuong7.js';

export const QUESTION_BANKS = {
  cs_station_1: CHUONG_1_QUIZ,
  cs_station_2: CHUONG_2_QUIZ,
  ict_station_1: CHUONG_1_QUIZ,
  ict_station_2: CHUONG_2_QUIZ,
  cs_station_3: CHUONG_3_QUIZ,
  ict_station_3: CHUONG_3_QUIZ,
  cs_station_4: CHUONG_4_QUIZ,
  ict_station_4: CHUONG_4_QUIZ,
  cs_station_5: CHUONG_5_QUIZ,
  ict_station_5: CHUONG_5_QUIZ,
  cs_station_6: CHUONG_6_QUIZ,
  ict_station_6: CHUONG_6_QUIZ,
  // Chương 7 - Lập trình Python cơ bản (dùng chung cho cả CS và ICT)
  cs_station_10: CHUONG_7_QUIZ,
  ict_station_10: CHUONG_7_QUIZ,
  // Chủ đề CS 1 - chỉ có ở định hướng Khoa học máy tính
  cs_station_7: CHUONG_CS1_QUIZ,
  // Chủ đề CS 2 - chỉ có ở định hướng Khoa học máy tính
  cs_station_8: CHUONG_CS2_QUIZ,
  // Chủ đề ICT 1 - chỉ có ở định hướng Tin học ứng dụng
  ict_station_7: CHUONG_ICT1_QUIZ,
  // Chủ đề ICT 2 - chỉ có ở định hướng Tin học ứng dụng
  ict_station_8: CHUONG_ICT2_QUIZ,
  
};

export function getStationQuiz(stationId) {
  return QUESTION_BANKS[stationId] || null;
}

export { CHUONG_1_QUIZ, CHUONG_2_QUIZ, CHUONG_3_QUIZ, CHUONG_4_QUIZ, CHUONG_5_QUIZ, CHUONG_6_QUIZ, CHUONG_7_QUIZ, CHUONG_CS1_QUIZ, CHUONG_ICT1_QUIZ, CHUONG_ICT2_QUIZ, CHUONG_CS2_QUIZ };
