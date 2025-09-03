import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors } from '@/utils/constants';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  visible,
  onClose,
  navigation,
}) => {
  const { user, isAuthenticated } = useAuthStore();

  const handleNavigate = (screen: string) => {
    onClose();
    navigation.navigate(screen);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>メニュー</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {/* 使い方ガイドを最上部に配置 */}
              <TouchableOpacity
                style={[styles.menuItem, styles.guideItem]}
                onPress={() => handleNavigate('Guide')}
              >
                <Ionicons name="book" size={20} color={Colors.primary} />
                <Text style={[styles.menuText, { color: Colors.primary, fontWeight: '600' }]}>
                  使い方ガイド
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {isAuthenticated ? (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigate('Profile')}
                  >
                    <Ionicons name="person-outline" size={20} color="#333" />
                    <Text style={styles.menuText}>プロフィール</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigate('Favorites')}
                  >
                    <Ionicons name="heart-outline" size={20} color="#333" />
                    <Text style={styles.menuText}>お気に入り</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigate('MyReviews')}
                  >
                    <Ionicons name="star-outline" size={20} color="#333" />
                    <Text style={styles.menuText}>マイレビュー</Text>
                  </TouchableOpacity>

                  {!user?.is_premium && (
                    <TouchableOpacity
                      style={[styles.menuItem, styles.premiumItem]}
                      onPress={() => handleNavigate('Premium')}
                    >
                      <Ionicons name="diamond-outline" size={20} color={Colors.warning} />
                      <Text style={[styles.menuText, { color: Colors.warning }]}>
                        プレミアムプラン
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigate('Login')}
                  >
                    <Ionicons name="log-in-outline" size={20} color="#333" />
                    <Text style={styles.menuText}>ログイン</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNavigate('SignUp')}
                  >
                    <Ionicons name="person-add-outline" size={20} color="#333" />
                    <Text style={styles.menuText}>新規登録</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('Settings')}
              >
                <Ionicons name="settings-outline" size={20} color="#333" />
                <Text style={styles.menuText}>設定</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('About')}
              >
                <Ionicons name="information-circle-outline" size={20} color="#333" />
                <Text style={styles.menuText}>このアプリについて</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 12,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  premiumItem: {
    backgroundColor: '#fff9e6',
  },
  guideItem: {
    backgroundColor: '#f0f7ff',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
});