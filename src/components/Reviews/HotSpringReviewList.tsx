import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { ReviewService, HotSpringReview } from '@/services/review.service';
import { Colors } from '@/utils/constants';
import { Ionicons } from '@expo/vector-icons';

interface HotSpringReviewListProps {
  hotSpringId: string;
}

export const HotSpringReviewList: React.FC<HotSpringReviewListProps> = ({ hotSpringId }) => {
  const [reviews, setReviews] = useState<HotSpringReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [hotSpringId]);

  const fetchReviews = async () => {
    setLoading(true);
    const fetchedReviews = await ReviewService.getHotSpringReviews(hotSpringId);
    setReviews(fetchedReviews);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#FFD700' : '#CCCCCC'}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={48} color="#CCCCCC" />
        <Text style={styles.emptyText}>まだ感想がありません</Text>
        <Text style={styles.emptySubtext}>最初の感想を投稿してみましょう</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {review.user_name?.charAt(0) || '?'}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{review.user_name}</Text>
                <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
              </View>
            </View>
            {renderStars(review.rating)}
          </View>
          <Text style={styles.reviewContent}>{review.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxHeight: 300,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999999',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555555',
  },
});