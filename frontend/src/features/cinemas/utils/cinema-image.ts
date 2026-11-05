import type { Cinema } from '../types/cinema.types';

export interface CinemaImageInfo {
  imageUrl: string | null;
  alt: string;
  isIllustrative: boolean;
  sourceUrl?: string;
  sourceNote?: string;
}

/**
 * Metadata map containing verified authentic images and illustrative assets for cinemas.
 * - CGV Sense City, Vincom Xuân Khánh, Vincom Hùng Vương: Publicly accessible site images from cgv.vn (site code 013, 036, 029).
 * - CGV Demo Cinema: Illustrative asset (unsplash), explicitly flagged as isIllustrative = true.
 */
interface VerifiedCinemaAsset {
  nameMatch: string;
  addressMatch?: string;
  imageUrl: string;
  sourceUrl: string;
  sourceNote: string;
  isIllustrative: boolean;
}

const VERIFIED_CINEMA_ASSETS: VerifiedCinemaAsset[] = [
  {
    nameMatch: 'Sense City',
    imageUrl:
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_2_.png',
    sourceUrl: 'https://www.cgv.vn/default/cinox/site/cgv-sense-city',
    sourceNote: 'Cụm rạp CGV Sense City Cần Thơ (Site 013)',
    isIllustrative: false,
  },
  {
    nameMatch: 'Xuân Khánh',
    imageUrl:
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-1_1.png',
    sourceUrl: 'https://www.cgv.vn/default/cinox/site/cgv-vincom-xuan-khanh',
    sourceNote: 'Cụm rạp CGV Vincom Xuân Khánh (Site 036)',
    isIllustrative: false,
  },
  {
    nameMatch: 'Hùng Vương',
    imageUrl:
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/h/vhv-980-500_4.png',
    sourceUrl: 'https://www.cgv.vn/default/cinox/site/cgv-vincom-hung-vuong',
    sourceNote: 'Cụm rạp CGV Vincom Hùng Vương (Site 029)',
    isIllustrative: false,
  },
  {
    nameMatch: 'Demo Cinema',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    sourceUrl: 'https://unsplash.com/photos/empty-cinema-hall-1489599849927-2ee91cede3ba',
    sourceNote: 'Ảnh minh họa phòng chiếu mẫu cho cụm rạp thử nghiệm (Demo)',
    isIllustrative: true,
  },
];

/**
 * Resolves the appropriate image for a cinema card:
 * 1. Checks if backend cinema object provides a verified imageUrl.
 * 2. Matches by cinema name or address against authentic verified public assets.
 * 3. Fallbacks to illustrative or null ("Chưa có hình ảnh rạp").
 */
export function getCinemaImage(cinema: Cinema): CinemaImageInfo {
  // 1. Direct image property from backend API if ever supplied
  const directImage = (cinema as unknown as { imageUrl?: string; image?: string }).imageUrl ||
    (cinema as unknown as { imageUrl?: string; image?: string }).image ||
    cinema.images?.[0];

  if (directImage) {
    return {
      imageUrl: directImage,
      alt: `Hình ảnh rạp ${cinema.name}`,
      isIllustrative: false,
    };
  }

  // 2. Identity match by name or address against verified assets
  const nameNorm = (cinema.name || '').toLowerCase();
  const addressNorm = (cinema.address || '').toLowerCase();

  const matched = VERIFIED_CINEMA_ASSETS.find(
    (asset) =>
      nameNorm.includes(asset.nameMatch.toLowerCase()) ||
      (asset.addressMatch && addressNorm.includes(asset.addressMatch.toLowerCase()))
  );

  if (matched) {
    return {
      imageUrl: matched.imageUrl,
      alt: `Hình ảnh rạp ${cinema.name}`,
      isIllustrative: matched.isIllustrative,
      sourceUrl: matched.sourceUrl,
      sourceNote: matched.sourceNote,
    };
  }

  // 3. No authentic or matched image
  return {
    imageUrl: null,
    alt: `Cụm rạp ${cinema.name}`,
    isIllustrative: false,
  };
}
