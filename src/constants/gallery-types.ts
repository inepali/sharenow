export const GALLERY_TYPES = [
  "Adventure", "Anniversary", "Architecture", "Automotive", "Baby", "Baptism/Christening",
  "Bar/Bat Mitzvah", "Birth", "Birthday", "Boudoir", "Bridal", "Brit", "Business",
  "Children", "Christmas", "Commercial", "Concert", "Confirmation", "Couples", "Dance",
  "Editorial", "Elopement", "Engagement", "Equine", "Event", "Family", "Farewell",
  "Film", "First Communion", "Food", "General", "Graduation", "Headshots", "Holidays",
  "Interiors", "Landscape", "Lifestyle", "Live Music", "Look Book", "Maternity",
  "Milestones", "Mini Session", "Modeling", "Newborn", "Other", "Outdoor",
  "Passion Portrait", "Personal Branding", "Pets", "Photo Booth", "Portraits",
  "Pre-Wedding", "Products", "Proposal", "Quinceanera", "Real Estate",
  "Rehearsal Dinner", "Religious", "School", "Seniors", "Sport", "Styled Shoots",
  "Theater", "Travel", "Video", "Vow Renewal", "Wedding", "Workshop"
] as const;

export type GalleryType = typeof GALLERY_TYPES[number];
