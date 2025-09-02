import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

interface RatingDisplayProps {
  rating: number;
  totalReviews?: number;
  size?: 'small' | 'medium' | 'large';
  showReviewCount?: boolean;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  totalReviews = 0,
  size = 'medium',
  showReviewCount = true,
}) => {
  const starSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons
            key={i}
            name="star"
            size={starSize}
            color={Colors.warning}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons
            key={i}
            name="star-half"
            size={starSize}
            color={Colors.warning}
          />
        );
      } else {
        stars.push(
          <Ionicons
            key={i}
            name="star-outline"
            size={starSize}
            color={Colors.warning}
          />
        );
      }
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      <Text style={[styles.ratingText, { fontSize }]}>
        {rating.toFixed(1)}
      </Text>
      {showReviewCount && totalReviews > 0 && (
        <Text style={[styles.reviewCount, { fontSize: fontSize - 2 }]}>
          ({totalReviews}件)
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  reviewCount: {
    color: '#666',
    marginLeft: 4,
  },
});