# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CAR Concierge is a React Native/Expo mobile application for finding parking spots and facilities in Japan. The app displays parking prices, convenience stores, hot springs, gas stations, and festivals on an interactive map with real-time data from Supabase.

## Development Commands

### Initial Setup
```bash
cd car-concierge-app
npm install
npx pod-install  # iOS only
```

### Running the Application
```bash
npm start                  # Start development server
npm run ios               # iOS simulator
npm run android           # Android emulator
npm run web               # Web browser
npx expo start --clear    # Clear cache and start
```

### Building
```bash
npx expo prebuild          # Generate native projects
eas build --platform ios   # iOS build (requires EAS CLI)
eas build --platform android # Android build (requires EAS CLI)
```

### Testing & Debugging
```bash
# No test scripts configured - app includes test screens:
# - TestAuth.tsx - Authentication flow testing
# - TestMapBounds.tsx - Map region testing
# - TestDataFetch.tsx - Data fetching testing
# - TestParkingFeeAdvanced.tsx - Fee calculation testing
# - TestNearbyData.tsx - Nearby search testing
# - TestOperatingHours.tsx - Hours parsing testing
# - TestParkingRates.tsx - Parking rates testing
# - DebugSupabase.tsx - Direct database queries
```

## Architecture

### Core Technologies
- **React Native** with **Expo SDK 54**
- **TypeScript** (strict mode enabled)
- **Zustand** for state management (`useMainStore`, `useAuthStore`)
- **Supabase** for backend (PostgreSQL + real-time)
- **React Query** for data fetching/caching
- **react-native-maps** for map functionality

### Data Flow Architecture
1. **MapScreen** renders the main map interface
2. User interactions trigger searches via **SupabaseService**
3. Results stored in **useMainStore** (Zustand)
4. **CustomMarker** components render spots on map
5. **CompactBottomPanel** provides filtering controls
6. **RankingListModal** shows top 20 parking spots by price
7. **SpotDetailBottomSheet** displays detailed information

### Key Architectural Decisions

#### Parking Fee Calculation
- `ParkingFeeCalculator.calculateFee()` handles complex fee structures
- Supports base rates, maximum rates, and time-based calculations
- Fees calculated client-side from `rates` array in database

#### Map Performance
- Only top 20 parking spots displayed (sorted by calculated fee)
- Warning alerts when >300 parking spots or >100 other facilities
- Markers use `tracksViewChanges={false}` for performance

#### Modal Stacking
- React Native limitation: Cannot stack multiple modals
- Solution: Close ranking modal before opening detail sheet
- Uses `setTimeout` for smooth transitions between modals

#### State Management Pattern
```typescript
// Central store manages:
- mapRegion: Current map viewport
- searchResults: Filtered and ranked spots
- selectedSpot: Currently selected location
- searchFilter: User preferences (categories, time, elevation)
- UI states: Loading, panel visibility
```

## Database Schema

### Supabase Tables
- `parking_spots`: Coin parking with rates, capacity, hours
- `convenience_stores`: Store locations with brand info
- `gas_stations`: Fuel stations with services
- `hot_springs`: Onsen facilities with amenities
- `festivals`: Event locations with dates

### Key Fields
```typescript
// Parking spot rates structure
rates: [
  { type: 'base', minutes: 10, price: 100 },
  { type: 'max', minutes: 1440, price: 5000 }
]

// Operating hours (JSON)
hours: {
  is_24h: boolean,
  hours: string,
  original_hours: string
}
```

## UI/UX Patterns

### Two-Stage Interaction
1. First tap on marker → Show callout
2. Second tap → Open detail sheet
3. In ranking list: First tap → Center on map, Second tap → Show details

### Filter System
- Three filter modes: 駐車料金 (parking fee), 周辺検索 (nearby search), 標高 (elevation)
- Elevation filter uses logarithmic scale (0-2000m with power 2.5)
- Time selector for parking duration calculation

### Visual Hierarchy
- Gold/Silver/Bronze markers for top 3 parking spots
- Selected markers scale 1.3x with red border
- Modal heights: Ranking 50%, Details 45% of screen

## Environment Configuration

Required `.env` variables:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Path Aliases

Configured in `tsconfig.json` and `babel.config.js`:
- `@/` → `src/`
- `@components/` → `src/components/`
- `@screens/` → `src/screens/`
- `@services/` → `src/services/`
- `@stores/` → `src/stores/`
- `@types/` → `src/types/`
- `@utils/` → `src/utils/`
- `@config/` → `src/config/`
- `@assets/` → `src/assets/`

## Common Development Tasks

### Adding New Spot Category
1. Add interface in `src/types/index.ts`
2. Create Supabase table and add to `SupabaseService`
3. Add category button in `CategoryButtons.tsx`
4. Update marker rendering in `CustomMarker.tsx`

### Modifying Fee Calculation
- Edit `src/services/parking-fee.service.ts`
- Test with `TestParkingFee.tsx` screen
- Rates array format: `{ type: 'base'|'max', minutes: number, price: number }`

### Debugging Data Issues
- Use `DebugSupabase.tsx` screen for direct database queries
- Check console logs (extensive logging throughout)
- Verify Supabase connection in `src/config/supabase.ts`

## Japanese Market Specifics

- All text primarily in Japanese
- Facility types: コインパーキング, コンビニ, 温泉, ガソリンスタンド, お祭り・花火大会
- Temperature calculation: -0.6°C per 100m elevation
- Tsunami marker at 30m elevation
- Coordinates centered on Japanese cities

## Performance Considerations

- React Query stale time: 5 minutes
- Map region updates throttled via `onRegionChangeComplete`
- Heavy operations (fee calculation) done for top 20 only
- Lazy loading for detail screens
- Animated transitions use `useNativeDriver: true`

## Authentication & User Management

### Architecture
- **AuthStore** (`useAuthStore.ts`): Zustand store managing authentication state with Supabase integration
- **AuthService** (`auth.service.ts`): Service layer handling authentication operations
- **User Profiles**: Separate `user_profiles` table linked to Supabase auth users

### Key Patterns
- **Session Synchronization**: `initializeAuth()` must be called in App.tsx to sync Supabase auth state with AuthStore
- **Profile Creation**: Uses `createProfileSafely()` method with duplicate checking to avoid conflicts
- **Session Validation**: Services perform both AuthStore and Supabase session validation before operations
- **Google OAuth**: Configured with `car-concierge-app://auth/callback` redirect URI

### Common Authentication Issues
- **Session Drift**: AuthStore shows authenticated but Supabase session expired → Use `checkAuth()` to resync
- **Profile Conflicts**: Use `createProfileSafely()` method with UPSERT to avoid duplicate key violations
- **State Inconsistency**: Always initialize auth monitoring in App.tsx with `useEffect(() => initializeAuth(), [])`
- **Review Posting Auth**: ReviewService validates both AuthStore and Supabase sessions before allowing posts

## Review System

### Components
- **ReviewModal**: Modal for posting reviews with 5-star rating and text input
- **ReviewList**: Displays existing reviews with user info and ratings
- **ReviewService**: Handles CRUD operations for parking spot reviews

### Database Schema
```sql
parking_reviews (
  id: uuid,
  parking_spot_id: bigint,
  user_id: uuid,
  content: text,
  rating: integer,
  created_at: timestamp
)
```

### Implementation Notes
- Reviews require valid authentication session
- User display names fetched from `user_profiles` table
- Review posting includes comprehensive auth state validation

## Error Handling Patterns

### Map Rendering Safety
- All marker rendering wrapped in try-catch blocks
- Strict data validation before creating React elements
- Use `React.isValidElement()` to verify markers before adding to array
- Graceful degradation when invalid data encountered

### Authentication Error Recovery
- Automatic session resync on auth failures
- Clear user feedback with specific error messages
- AsyncStorage cleanup on session invalidation
- Retry mechanisms for transient auth issues

## Navigation Structure

### Stack Navigator (App.tsx)
- **Main Screens**: Map, Profile, Settings, Help, About, Favorites, MyReviews, Premium, Terms, Privacy, Guide
- **Auth Screens**: Login, SignUp, ForgotPassword, TermsOfService
- **Test Screens**: TestAuth, TestMap, TestData, DebugSupabase, TestHours, TestNearby, TestParkingFee
- **Modal**: SpotDetail (presented as modal)

## Known Issues & Solutions

### iOS Build Issues
- Run `npx pod-install` after package updates
- Clear Metro cache: `npx expo start --clear`
- Reset watchman: `watchman watch-del-all`

### Supabase Connection
- Verify `.env` contains valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Check RLS policies on Supabase dashboard for authentication issues
- Use DebugSupabase screen for direct query testing

## App Configuration

### Bundle & Build Settings
- **iOS Bundle ID**: `com.carconciege.app`
- **Android Package**: `com.carconciege.app`
- **App Name**: 車旅コンシェルジュ (CAR Concierge)
- **EAS Project ID**: `faf23c02-6ed4-4585-bd02-6c6e5130890c`
- **Owner**: hiroakiyasa

### Permissions
- Location (GPS for map centering)
- Camera (for spot photos)
- Photo Library (read/write for reviews)

## Services Architecture

### Core Services
- **SupabaseService** (`supabase.service.ts`): Database queries, data fetching
- **AuthService** (`auth.service.ts`): Authentication operations, OAuth
- **ParkingFeeCalculator** (`parking-fee.service.ts`): Complex fee calculations
- **ReviewService** (`review.service.ts`): Review CRUD operations
- **FavoritesService** (`favorites.service.ts`): User favorites management
- **LocationService** (`location.service.ts`): GPS and location utilities
- **SearchService** (`search.service.ts`): Search and filtering logic

### Data Fetching Pattern
- React Query handles caching with 5-minute stale time
- Services return typed data from Supabase
- Error boundaries catch and display failures gracefully

## Component Structure

### Map Components
- `MapScreen.tsx`: Main map view orchestrator
- `CustomMarker.tsx`: Renders individual map markers
- `CompactBottomPanel.tsx`: Filter controls UI
- `CategoryButtons.tsx`: Facility type selector

### Detail Components
- `SpotDetailBottomSheet.tsx`: Detailed spot information
- `RankingListModal.tsx`: Top 20 parking by price
- `ReviewModal.tsx`: Review submission interface
- `ReviewList.tsx`: Display existing reviews

### Review Components (src/components/Reviews/)
- `ReviewModal.tsx`: Parking review submission
- `ReviewList.tsx`: Parking review display
- `HotSpringReviewModal.tsx`: Hot spring review submission
- `HotSpringReviewList.tsx`: Hot spring review display