import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoViewerProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  thumbnailUrl?: string;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  visible,
  onClose,
  imageUrl,
  thumbnailUrl,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [imageSize, setImageSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (imageUrl) {
      Image.getSize(
        imageUrl,
        (width, height) => {
          // Calculate dimensions to fit screen while maintaining aspect ratio
          const aspectRatio = width / height;
          let newWidth = SCREEN_WIDTH;
          let newHeight = SCREEN_WIDTH / aspectRatio;

          if (newHeight > SCREEN_HEIGHT * 0.8) {
            newHeight = SCREEN_HEIGHT * 0.8;
            newWidth = newHeight * aspectRatio;
          }

          setImageSize({ width: newWidth, height: newHeight });
        },
        (error) => {
          console.error('Error getting image size:', error);
          // Set default size if error
          setImageSize({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
        }
      );
    }
  }, [imageUrl]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          maximumZoomScale={3}
          minimumZoomScale={1}
          pinchGestureEnabled
        >
          <View style={styles.imageContainer}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}

            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.image,
                {
                  width: imageSize.width,
                  height: imageSize.height,
                }
              ]}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
});