export const DATA = {
  MANIFESTS: [
    "ENTEBBE",
    "BUGEMBO",
    "GOMBA",
    "KAKOOGE",
    "KAYUNGA",
    "KIBOGA",
    "KITWE",
    "KIWOKO",
    "KYANKWANZI",
    "LUGAZI",
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
  ENTEBBE_CATEGORIES: [
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
    "KITARA-KISUBI",
    "KITOORO",
    "KITUBULU",
    "LUGONJO",
    "LYAMUTUNDWE",
    "MPALA-BUBULI",
    "NAKIWOGO-BANGA",
    "NKUMBA",
    "NSAMIZI-LUNYO"
  ],
  ENTEBBE_CAMPUSES: [
    "FISHERIES",
    "ISLM",
    "KISUBI",
    "KUBIS",
    "METEROLOGY",
    "MILDMAY",
    "NKUMBA",
    "SKYVIEW",
    "ST. JOSEPH INSTITUTE",
    "SYNERGY",
    "OTHER"
  ],
  CHURCH_ROLES: [
    "Pastor",
    "Member"
  ]
};

// Create a combined list of all Entebbe residentials and campuses for the Bring 20 dropdown
export const ALL_RESIDENCES = [
  ...DATA.ENTEBBE_RESIDENTIALS,
  ...DATA.ENTEBBE_CAMPUSES.filter(c => c !== "OTHER")
].sort();
