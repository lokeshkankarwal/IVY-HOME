export interface Property {
  id: string;
  sellerId?: string;
  title: string;
  description: string;
  propertyType: "APARTMENT" | "VILLA" | "INDEPENDENT_HOUSE" | "PLOT" | "BUILDER_FLOOR";
  bhk: number;
  bathrooms: number;
  price: number;
  carpetArea: number;
  superBuiltUpArea?: number;
  furnishing: "UNFURNISHED" | "SEMI_FURNISHED" | "FULLY_FURNISHED";
  floor?: number;
  totalFloors?: number;
  parking?: number;
  address: string;
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
  contactName?: string;
  contactPhone?: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "SOLD";
  views?: number;
  createdAt?: string;
  images?: { id: string; path: string; isPrimary: boolean; sortOrder: number }[];
  primaryImage?: string;
  seller?: { name: string; email?: string; phone?: string };
}

export interface IvyListing {
  listing_id: string;
  listing_url?: string;
  website?: string;
  city_id?: number;
  apartment_name?: string;
  locality: string;
  property_type: string;
  bedroom: number;
  bathroom?: number;
  balcony?: number;
  floor?: number;
  total_floors?: number;
  furnishing: string;
  facing_direction?: string;
  covered_parking?: number;
  price: number;
  carpet_area: number;
  super_built_up_area?: number;
  latitude: number;
  longitude: number;
  posted_by?: string;
  posted_by_name?: string;
  posted_by_contact?: string;
  project_id?: string;
  description?: string;
  posted_at?: string;
  is_verified?: boolean;
  is_live?: boolean;
}

export interface IvyRental {
  listing_id: string;
  listing_url?: string;
  website?: string;
  city_id?: number;
  title: string;
  apartment_name?: string;
  locality: string;
  property_type: string;
  bedroom: number;
  bathroom?: number;
  floor?: number;
  total_floors?: number;
  furnishing: string;
  facing_direction?: string;
  price: number;
  deposit: number;
  maintenance?: number;
  carpet_area: number;
  super_builtup_area?: number;
  latitude: number;
  longitude: number;
  posted_by?: string;
  posted_by_name?: string;
  posted_by_contact?: string;
  description?: string;
  posted_at?: string;
}

export interface IvyProject {
  project_id: string;
  project_url?: string;
  city_id?: number;
  apartment_name: string;
  developer_name?: string;
  locality: string;
  project_status?: string;
  total_units?: number;
  total_towers?: number;
  total_floors?: number;
  launch_date?: string;
  possession_date?: string;
  rera_number?: string;
  min_area_sqft?: number;
  max_area_sqft?: number;
  total_listings?: number;
  price_min?: number;
  price_max?: number;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
}
