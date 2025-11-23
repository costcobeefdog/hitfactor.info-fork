export interface AlgoliaMatchNumericFilters {
  timestamp_utc_updated: number;
}

export interface AlgoliaMatch {
  id: number;
  created: string; // iso string without z
  updated: string; // iso string without z

  // club shit / address strings
  club_id: string; //number inside of a string
  front_club_city: string;
  front_club_country: string;
  front_club_county_no_r: string;
  front_club_id: number;
  front_club_state: string;

  // concat these 2 for full street address
  front_club_street: string;
  front_club_street_number: string;

  // urls
  front_club_url_slug: string;
  front_match_slug: string;

  front_match_id: number;
  match_date: string; // '2024-01-01' format
  match_id: string; // uuid-string, aka upload
  match_name: string;
  match_subtype: string;
  match_type: string; // uspsa_p
  objectID: string;
  ps_club_code: number;
  templateName: string; // "Hit Factor", 'USPSA', etc
  timestamp_utc_updated: number; // 1737840000
  version: string; // "2.0"
}
