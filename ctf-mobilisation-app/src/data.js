export const DATA = {
  MANIFESTS: [
    "ENTEBBE",
    "KAJJANSI",
    "BUGEMBO",
    "GOMBA",
    "KAKOOGE",
    "KAYUNGA",
    "KIBOGA",
    "KITWE",
    "KIWOKO",
    "KYANKWANZI",
    "LUGAZI/BUIKWE",
    "LUWEERO",
    "MITYANA",
    "MPIGI",
    "MUBENDE",
    "NAKASONGOLA",
    "NAKAWUKA",
    "NDEJJE",
    "SECRETARIAT",
    "SEMUTO"
  ],
  // First screen of the Registration flow.
  // CENTRAL REGION holds every manifest above except Entebbe and Kajjansi (see CENTRAL_MANIFESTS).
  // OTHER REGIONS lets the user type in a manifest name that is not on the list.
  LOCATIONS: [
    "ENTEBBE",
    "KAJJANSI",
    "CENTRAL REGION",
    "OTHER REGIONS"
  ],
  ENTEBBE_CATEGORIES: [
    "Entebbe Mission",
    "Residentials",
    "Campuses",
    "Churches",
    "Schools",
    "Bring 20"
  ],
  OTHER_CATEGORIES: [
    "Residential",
    "Campuses"
  ],
  // Every Entebbe Mission area, in the order of the mission outreach schedule,
  // then the areas that are not on this week's schedule.
  ENTEBBE_MISSION_AREAS: [
    "KIGUNGU",
    "BUGONGA",
    "FISHERIES INSTITUTE",
    "SURVEY INSTITUTE",
    "BANGA-NAKIWOGO",
    "LUGONJO",
    "KITOORO",
    "KATABI",
    "BUNONO",
    "KABALE-KIWAFU",
    "KITUBULU",
    "NKUMBA UNIVERSITY",
    "LYAMUTUNDWE",
    "HOSPITAL MINISTRY",
    "MPALA-BUBULI",
    "KITARA-KISUBI",
    "GARUGA",
    "KISUBI UNIVERSITY",
    "BUWAYA",
    "NKUMBA",
    "ABAITA",
    "NSAMIZI-LUNYO",
    "KASENYI"
  ],
  // Mission outreach schedule (from the flyer). The Entebbe Mission list puts today's areas
  // first, yesterday's next, then the coming days, then the other areas, then older days.
  // Dates are YYYY-MM-DD. Area names must match ENTEBBE_MISSION_AREAS exactly.
  // Friday 6 Nov is the drive from Kitooro to Garuga, which uses areas already listed.
  ENTEBBE_MISSION_SCHEDULE: [
    { date: "2026-10-31", areas: ["KIGUNGU"] },
    { date: "2026-11-01", areas: ["BUGONGA", "FISHERIES INSTITUTE", "SURVEY INSTITUTE"] },
    { date: "2026-11-02", areas: ["BANGA-NAKIWOGO", "LUGONJO", "KITOORO"] },
    { date: "2026-11-03", areas: ["KATABI", "BUNONO"] },
    { date: "2026-11-04", areas: ["KABALE-KIWAFU", "KITUBULU", "NKUMBA UNIVERSITY", "LYAMUTUNDWE", "HOSPITAL MINISTRY"] },
    { date: "2026-11-05", areas: ["MPALA-BUBULI", "KITARA-KISUBI", "GARUGA", "KISUBI UNIVERSITY"] }
  ],
  ENTEBBE_RESIDENTIALS: [
    "ABAITA",
    "BANGA-NAKIWOGO",
    "BUGONGA",
    "BUNONO",
    "BUWAYA",
    "GARUGA",
    "KABALE-KIWAFU",
    "KASENYI",
    "KATABI",
    "KIGUNGU",
    "KITARA-KISUBI",
    "KITOORO",
    "KITUBULU",
    "LUGONJO",
    "LYAMUTUNDWE",
    "MPALA-BUBULI",
    "NKUMBA",
    "NSAMIZI-LUNYO"
  ],
  ENTEBBE_CAMPUSES: [
    "FISHERIES",
    "ISLM",
    "KISUBI",
    "KUBIS",
    "METEROLOGY",
    "NKUMBA",
    "SKYVIEW",
    "ST. JOSEPH INSTITUTE",
    "ALUMNI",
    "OTHER"
  ],
  CHURCH_ROLES: [
    "Pastor",
    "Member"
  ]
};

// ---------------------------------------------------------
// Entebbe Mission list ordered by day
// ---------------------------------------------------------
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// YYYY-MM-DD in the phone's own time zone
const toDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// "2026-11-02" -> "Mon 2 Nov"
const dayLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
};

// Groups the Entebbe Mission areas for the area picker:
// today, yesterday (late entries), the coming days, areas not on the schedule, then older days.
// kind is 'today' | 'yesterday' | 'upcoming' | 'other' | 'earlier'.
export function groupMissionAreas(now = new Date()) {
  const today = toDateKey(now);
  const yesterday = toDateKey(addDays(now, -1));
  const tomorrow = toDateKey(addDays(now, 1));
  const schedule = DATA.ENTEBBE_MISSION_SCHEDULE.filter(d => d.areas.length > 0);
  const scheduled = new Set(schedule.flatMap(d => d.areas));
  const groups = [];

  const todays = schedule.find(d => d.date === today);
  if (todays) groups.push({ key: today, kind: 'today', label: dayLabel(today), areas: todays.areas });

  const yesterdays = schedule.find(d => d.date === yesterday);
  if (yesterdays) groups.push({ key: yesterday, kind: 'yesterday', label: dayLabel(yesterday), areas: yesterdays.areas });

  schedule
    .filter(d => d.date > today)
    .forEach(d => groups.push({
      key: d.date,
      kind: 'upcoming',
      label: (d.date === tomorrow ? 'Tomorrow · ' : '') + dayLabel(d.date),
      areas: d.areas
    }));

  const others = DATA.ENTEBBE_MISSION_AREAS.filter(a => !scheduled.has(a));
  if (others.length > 0) groups.push({ key: 'other', kind: 'other', label: 'Other areas', areas: others });

  schedule
    .filter(d => d.date < yesterday)
    .reverse()
    .forEach(d => groups.push({ key: d.date, kind: 'earlier', label: `Earlier · ${dayLabel(d.date)}`, areas: d.areas }));

  return groups;
}

// Manifests listed under "Central Region" in the Registration flow (Bugembo to Semuto)
export const CENTRAL_MANIFESTS = DATA.MANIFESTS.filter(m => m !== 'ENTEBBE' && m !== 'KAJJANSI');

// Create a combined list of all Entebbe residentials and campuses for the Bring 20 dropdown
export const ALL_RESIDENCES = [
  ...DATA.ENTEBBE_RESIDENTIALS,
  ...DATA.ENTEBBE_CAMPUSES.filter(c => c !== "OTHER" && c !== "ALUMNI")
].sort();

export const DEPARTMENTS = [
  "Media",
  "Sales",
  "Communications",
  "Finance",
  "Follow up",
  "Hospital",
  "Schools",
  "Security and Parking",
  "Set up",
  "Choir",
  "Projection and Sound",
  "Ushering",
  "Welfare",
  "Protocol",
  "Sanitation",
  "Registration & Information",
  "Transportation",
  "First Aid",
  "Testimonies"
].sort();
