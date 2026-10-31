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
  ENTEBBE_MISSION_AREAS: [
    "BUWAYA",
    "BANGA-NAKIWOGO",
    "LUGONJO",
    "GARUGA",
    "KITARA-KISUBI",
    "MPALA-BUBULI",
    "LYAMUTUNDWE",
    "NKUMBA",
    "ABAITA",
    "KABALE-KIWAFU",
    "BUNONO",
    "KITUBULU",
    "NSAMIZI-LUNYO",
    "KATABI",
    "BUGONGA",
    "KITOORO",
    "KIGUNGU",
    "KASENYI",
    "NKUMBA UNIVERSITY",
    "KISUBI UNIVERSITY",
    "FISHERIES INSTITUTE",
    "SURVEY INSTITUTE"
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
