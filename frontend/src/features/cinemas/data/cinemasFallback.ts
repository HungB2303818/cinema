import type { CinemaDetail, CinemaMeta } from '../types/cinema.types';

export const CINEMA_METADATA_MAP: Record<string, CinemaMeta> = {
  'CGV Sense City Cần Thơ': {
    city: 'Cần Thơ',
    hotline: '1900 6017',
    fax: '+84 4 6 275 5240',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3928.7908824104866!2d105.78596999999999!3d10.034108000000002!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a062a1b96326ad%3A0xfbd180a2dbc512c4!2sCGV+Sense+City!5e0!3m2!1sen!2s!4v1423116739120',
    bannerImage:
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_2_.png',
    images: [
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_2_.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_1_.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_3_.jpg',
    ],
    roomTypes: ['2D', '3D', 'Sweetbox'],
    features: ['Dolby Surround 7.1', 'Ghế Sweetbox', 'Bãi đỗ xe TTTM', 'Combo Bắp Nước CGV'],
  },
  'CGV Vincom Xuân Khánh': {
    city: 'Cần Thơ',
    hotline: '1900 6017',
    fax: '+84 4 6 275 5240',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3928.90118651547!2d105.77325511479431!3d10.02501259283402!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a08825cac18fad%3A0xf069d6c6dcc6cf98!2sCGV+Vincom+Xu%C3%A2n+Kh%C3%A1nh!5e0!3m2!1sen!2s!4v1473402809463',
    bannerImage:
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-1_1.png',
    images: [
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-1_1.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-3_1.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-2_1.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-5_1.png',
    ],
    roomTypes: ['2D', '3D', 'Gold Class', 'Sweetbox'],
    features: ['Phòng Gold Class', 'Dolby 7.1', 'Ghế bọc da ngả lưng', 'Phục vụ đồ uống miễn phí tại Gold Class'],
  },
  'CGV Vincom Hùng Vương': {
    city: 'Cần Thơ',
    hotline: '1900 6017',
    fax: '+84 4 6 275 5240',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7857.314378475995!2d105.77869384301852!3d10.045121085541775!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a0880320a68e11%3A0x480ddc735b87a1fe!2zVHJ1bmcgVMOibSBUaMawxqFuZyBN4bqhaSBWaW5jb20gSMO5bmcgVsawxqFuZy1D4bqnbiBUaMah!5e0!3m2!1svi!2s!4v1449047435061',
    bannerImage:
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/h/vhv-980-500_4.png',
    images: [
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/h/vhv-980-500_4.png',
    ],
    roomTypes: ['2D', '3D'],
    features: ['Dolby 7.1', 'Màn chiếu tiêu chuẩn Hollywood', 'Không gian hiện đại', 'TTTM Vincom'],
  },
  'CGV Demo Cinema': {
    city: 'Hà Nội',
    hotline: '1900 6017',
    mapEmbedUrl: 'https://www.google.com/maps',
    bannerImage:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80',
    ],
    roomTypes: ['2D', '3D'],
    features: ['Màn hình cong', 'Dolby Atmos'],
  },
};

export const FALLBACK_CINEMAS: CinemaDetail[] = [
  {
    id: 2,
    name: 'CGV Sense City Cần Thơ',
    address: 'Tầng 3, TTTM Sense City, Số 1 Đại Lộ Hòa Bình, Phường Tân An, Quận Ninh Kiều, Cần Thơ',
    status: 'ACTIVE',
    city: 'Cần Thơ',
    hotline: '1900 6017',
    fax: '+84 4 6 275 5240',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3928.7908824104866!2d105.78596999999999!3d10.034108000000002!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a062a1b96326ad%3A0xfbd180a2dbc512c4!2sCGV+Sense+City!5e0!3m2!1sen!2s!4v1423116739120',
    images: [
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_2_.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_1_.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/1/_/1_3_.jpg',
    ],
    roomsCount: 6,
    roomTypes: ['2D', '3D', 'Sweetbox'],
    rooms: [
      { id: 3, cinemaId: 2, name: 'Phòng 01 (2D)', status: 'ACTIVE' },
      { id: 4, cinemaId: 2, name: 'Phòng 02 (2D)', status: 'ACTIVE' },
      { id: 5, cinemaId: 2, name: 'Phòng 03 (3D)', status: 'ACTIVE' },
      { id: 6, cinemaId: 2, name: 'Phòng 04 (2D)', status: 'ACTIVE' },
      { id: 7, cinemaId: 2, name: 'Phòng 05 (2D)', status: 'ACTIVE' },
      { id: 8, cinemaId: 2, name: 'Phòng 06 (3D/Sweetbox)', status: 'ACTIVE' },
    ],
  },
  {
    id: 3,
    name: 'CGV Vincom Xuân Khánh',
    address: 'Tầng 5, TTTM Vincom Plaza Xuân Khánh, Số 209 Đường 30/04, Phường Xuân Khánh, Quận Ninh Kiều, Cần Thơ',
    status: 'ACTIVE',
    city: 'Cần Thơ',
    hotline: '1900 6017',
    fax: '+84 4 6 275 5240',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3928.90118651547!2d105.77325511479431!3d10.02501259283402!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a08825cac18fad%3A0xf069d6c6dcc6cf98!2sCGV+Vincom+Xu%C3%A2n+Kh%C3%A1nh!5e0!3m2!1sen!2s!4v1473402809463',
    images: [
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-1_1.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-3_1.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-2_1.png',
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/x/vxk-5_1.png',
    ],
    roomsCount: 6,
    roomTypes: ['2D', '3D', 'Gold Class', 'Sweetbox'],
    rooms: [
      { id: 9, cinemaId: 3, name: 'Phòng 01 (2D)', status: 'ACTIVE' },
      { id: 10, cinemaId: 3, name: 'Phòng 02 (2D)', status: 'ACTIVE' },
      { id: 11, cinemaId: 3, name: 'Phòng 03 (3D)', status: 'ACTIVE' },
      { id: 12, cinemaId: 3, name: 'Phòng 04 (3D)', status: 'ACTIVE' },
      { id: 13, cinemaId: 3, name: 'Phòng 05 (Gold Class)', status: 'ACTIVE' },
      { id: 14, cinemaId: 3, name: 'Phòng 06 (2D/Sweetbox)', status: 'ACTIVE' },
    ],
  },
  {
    id: 4,
    name: 'CGV Vincom Hùng Vương',
    address: 'Tầng 6, TTTM Vincom Plaza Hùng Vương, Số 2 Hùng Vương, Phường Thới Bình, Quận Ninh Kiều, Cần Thơ',
    status: 'ACTIVE',
    city: 'Cần Thơ',
    hotline: '1900 6017',
    fax: '+84 4 6 275 5240',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7857.314378475995!2d105.77869384301852!3d10.045121085541775!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a0880320a68e11%3A0x480ddc735b87a1fe!2zVHJ1bmcgVMOibSBUaMawxqFuZyBN4bqhaSBWaW5jb20gSMO5bmcgVsawxqFuZy1D4bqnbiBUaMah!5e0!3m2!1svi!2s!4v1449047435061',
    images: [
      'https://static-cgv.vncdn.vn/media/site/cache/1/980x415/b58515f018eb873dafa430b6f9ae0c1e/v/h/vhv-980-500_4.png',
    ],
    roomsCount: 4,
    roomTypes: ['2D', '3D'],
    rooms: [
      { id: 15, cinemaId: 4, name: 'Phòng 01 (2D)', status: 'ACTIVE' },
      { id: 16, cinemaId: 4, name: 'Phòng 02 (2D)', status: 'ACTIVE' },
      { id: 17, cinemaId: 4, name: 'Phòng 03 (3D)', status: 'ACTIVE' },
      { id: 18, cinemaId: 4, name: 'Phòng 04 (2D)', status: 'ACTIVE' },
    ],
  },
  {
    id: 1,
    name: 'CGV Demo Cinema',
    address: 'Tầng 5, TTTM Demo, Hà Nội',
    status: 'ACTIVE',
    city: 'Hà Nội',
    hotline: '1900 6017',
    mapEmbedUrl: 'https://www.google.com/maps',
    images: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80',
    ],
    roomsCount: 2,
    roomTypes: ['2D', '3D'],
    rooms: [
      { id: 1, cinemaId: 1, name: 'Phòng 01', status: 'ACTIVE' },
      { id: 2, cinemaId: 1, name: 'Phòng 02', status: 'ACTIVE' },
    ],
  },
];
