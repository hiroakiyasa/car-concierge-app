import { Platform } from 'react-native';

// Unsplash API configuration
const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // 実際のAPIキーに置き換えてください

// 美しい日本の風景写真のコレクション
const JAPAN_COLLECTIONS = {
  landscapes: 'japan landscape cherry blossom',
  mountains: 'mount fuji japan',
  temples: 'japan temple shrine kyoto',
  cities: 'tokyo japan city night',
  nature: 'japan nature forest bamboo',
  seasons: 'japan autumn leaves sakura',
};

// カテゴリー別の検索キーワード
const CATEGORY_QUERIES = {
  discover: 'japan cherry blossom sakura spring landscape',
  explore: 'japan traditional street kyoto temple',
  parking: 'japan city tokyo urban modern car',
  nearby: 'japan convenience store city street',
  elevation: 'mount fuji japan mountain landscape',
  ranking: 'tokyo tower japan city skyline night',
};

// デモ用の美しい日本の風景画像URL（Unsplash API未設定の場合のフォールバック）
const FALLBACK_IMAGES = {
  discover: [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80', // 京都の寺
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80', // 富士山と桜
    'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800&q=80', // 京都の竹林
  ],
  explore: [
    'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80', // 富士山
    'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=800&q=80', // 日本の街
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&q=80', // 東京の夜景
  ],
  parking: [
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80', // 東京の街
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80', // 東京タワー
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80', // 東京の夜
  ],
  nearby: [
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', // 日本の通り
    'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=800&q=80', // 日本の店
    'https://images.unsplash.com/photo-1542931287-023b922fa89b?w=800&q=80', // 東京の街並み
  ],
  elevation: [
    'https://images.unsplash.com/photo-1570459027562-4a916cc6113f?w=800&q=80', // 富士山頂上
    'https://images.unsplash.com/photo-1578662996442-48f60103fc81?w=800&q=80', // 富士山と湖
    'https://images.unsplash.com/photo-1605206809956-f40de8de6470?w=800&q=80', // 山の風景
  ],
  ranking: [
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80', // 東京の夜景
    'https://images.unsplash.com/photo-1549693578-d683be217e58?w=800&q=80', // 渋谷
    'https://images.unsplash.com/photo-1555883006-0f5a0915a80f?w=800&q=80', // 新宿
  ],
};

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
  blur_hash?: string;
}

class UnsplashService {
  private cache: Map<string, UnsplashImage[]> = new Map();
  private isApiConfigured: boolean = false;

  constructor() {
    this.isApiConfigured = UNSPLASH_ACCESS_KEY !== 'YOUR_UNSPLASH_ACCESS_KEY';
  }

  /**
   * カテゴリーに基づいて日本の美しい風景写真を取得
   */
  async getJapanImages(category: keyof typeof CATEGORY_QUERIES): Promise<UnsplashImage[]> {
    // キャッシュチェック
    const cacheKey = `japan_${category}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // APIが設定されていない場合はフォールバック画像を使用
    if (!this.isApiConfigured) {
      return this.getFallbackImages(category);
    }

    try {
      const query = CATEGORY_QUERIES[category];
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Unsplash');
      }

      const data = await response.json();
      const images = data.results as UnsplashImage[];
      
      // キャッシュに保存
      this.cache.set(cacheKey, images);
      
      return images;
    } catch (error) {
      console.error('Error fetching Unsplash images:', error);
      return this.getFallbackImages(category);
    }
  }

  /**
   * ランダムな日本の風景写真を取得
   */
  async getRandomJapanImage(): Promise<UnsplashImage | null> {
    if (!this.isApiConfigured) {
      return this.getRandomFallbackImage();
    }

    try {
      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=japan%20landscape&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Unsplash');
      }

      return await response.json() as UnsplashImage;
    } catch (error) {
      console.error('Error fetching random Unsplash image:', error);
      return this.getRandomFallbackImage();
    }
  }

  /**
   * フォールバック画像を取得
   */
  private getFallbackImages(category: keyof typeof FALLBACK_IMAGES): UnsplashImage[] {
    const urls = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.discover;
    return urls.map((url, index) => ({
      id: `fallback_${category}_${index}`,
      urls: {
        raw: url,
        full: url,
        regular: url,
        small: url.replace('w=800', 'w=400'),
        thumb: url.replace('w=800', 'w=200'),
      },
      description: `Beautiful Japan - ${category}`,
      alt_description: `Japanese landscape for ${category}`,
      user: {
        name: 'Unsplash',
        username: 'unsplash',
      },
    }));
  }

  /**
   * ランダムなフォールバック画像を取得
   */
  private getRandomFallbackImage(): UnsplashImage {
    const allImages = Object.values(FALLBACK_IMAGES).flat();
    const randomUrl = allImages[Math.floor(Math.random() * allImages.length)];
    
    return {
      id: `fallback_random_${Date.now()}`,
      urls: {
        raw: randomUrl,
        full: randomUrl,
        regular: randomUrl,
        small: randomUrl.replace('w=800', 'w=400'),
        thumb: randomUrl.replace('w=800', 'w=200'),
      },
      description: 'Beautiful Japan',
      alt_description: 'Random Japanese landscape',
      user: {
        name: 'Unsplash',
        username: 'unsplash',
      },
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
  }
}

export const unsplashService = new UnsplashService();