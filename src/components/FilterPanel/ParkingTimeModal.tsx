import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 50;
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.3;

interface ParkingTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startTime: Date, endTime: Date) => void;
  initialStartTime?: Date;
  initialEndTime?: Date;
  mode?: 'entry' | 'duration' | 'exit';
}

export const ParkingTimeModal: React.FC<ParkingTimeModalProps> = ({
  visible,
  onClose,
  onConfirm,
  mode = 'duration',
}) => {
  // タブの初期設定
  const getInitialTab = () => {
    if (mode === 'entry') return 'entry';
    return 'duration';
  };
  
  const [activeTab, setActiveTab] = useState<'entry' | 'duration'>(getInitialTab());
  
  // 駐車時間の選択
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(2); // デフォルト30分
  
  // 入庫日時の選択（現在時刻をデフォルト）
  const now = new Date();
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedHourIndex, setSelectedHourIndex] = useState(now.getHours());
  // Fix: Calculate initial minute index without using the minutes array
  const getInitialMinuteIndex = () => {
    const currentMinute = now.getMinutes();
    const roundedMinute = Math.floor(currentMinute / 10) * 10;
    // Map to index: 0->0, 10->1, 20->2, 30->3, 40->4, 50->5
    return Math.floor(roundedMinute / 10);
  };
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(getInitialMinuteIndex());

  const durationScrollRef = useRef<ScrollView>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // 駐車時間のオプション
  const durations = [
    { minutes: 10, label: '10分間' },
    { minutes: 20, label: '20分間' },
    { minutes: 30, label: '30分間' },
    { minutes: 40, label: '40分間' },
    { minutes: 50, label: '50分間' },
    { minutes: 60, label: '1時間' },
    { minutes: 90, label: '1時間30分' },
    { minutes: 120, label: '2時間' },
    { minutes: 150, label: '2時間30分' },
    { minutes: 180, label: '3時間' },
    { minutes: 240, label: '4時間' },
    { minutes: 300, label: '5時間' },
    { minutes: 360, label: '6時間' },
    { minutes: 480, label: '8時間' },
    { minutes: 600, label: '10時間' },
    { minutes: 720, label: '12時間' },
    { minutes: 1440, label: '24時間' },
  ];

  // 日付オプション
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekday = weekdays[date.getDay()];
      
      dates.push({
        label: `${month}月${day}日 ${weekday}`,
        date: date
      });
    }
    return dates;
  };

  const dates = generateDates();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 6 }, (_, i) => i * 10); // 0, 10, 20, 30, 40, 50

  // 終了時刻の計算
  const calculateEndTime = (durationMinutes: number) => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    
    const month = endTime.getMonth() + 1;
    const day = endTime.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[endTime.getDay()];
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    
    return `〜${month}月${day}日 ${weekday} ${hour}:${minute.toString().padStart(2, '0')}`;
  };

  // 現在時刻へ設定
  const setToCurrentTime = () => {
    try {
      const now = new Date();
      setSelectedDateIndex(0);
      setSelectedHourIndex(now.getHours());
      
      // Find the closest minute value
      const currentMinute = now.getMinutes();
      const roundedMinute = Math.round(currentMinute / 10) * 10;
      // Ensure it's within 0-50 range
      const clampedMinute = Math.min(50, Math.max(0, roundedMinute));
      // Convert to index: 0->0, 10->1, 20->2, 30->3, 40->4, 50->5
      const adjustedIndex = clampedMinute / 10;
      
      setSelectedMinuteIndex(adjustedIndex);
      
      // スクロール位置を更新
      setTimeout(() => {
        scrollToIndex(dateScrollRef, 0);
        scrollToIndex(hourScrollRef, now.getHours());
        scrollToIndex(minuteScrollRef, adjustedIndex);
      }, 100);
    } catch (error) {
      console.error('Error in setToCurrentTime:', error);
    }
  };

  // 指定インデックスへスクロール（中央配置用）
  const scrollToIndex = (ref: React.RefObject<ScrollView | null>, index: number) => {
    if (ref.current) {
      const offset = index * ITEM_HEIGHT;
      ref.current.scrollTo({ y: offset, animated: true });
    }
  };

  // スクロールハンドラー
  const handleScroll = (event: any, setter: (value: number) => void, maxIndex: number) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    setter(clampedIndex);
  };

  const handleScrollEnd = (event: any, ref: React.RefObject<ScrollView | null>, setter: (value: number) => void, maxIndex: number) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    setter(clampedIndex);
    scrollToIndex(ref, clampedIndex);
  };

  const handleConfirm = () => {
    try {
      let startTime: Date;
      
      if (activeTab === 'entry') {
        const selectedDate = dates[selectedDateIndex].date;
        startTime = new Date(selectedDate);
        startTime.setHours(hours[selectedHourIndex]);
        // Fix: minutes array already contains actual minute values (0, 10, 20, etc.)
        startTime.setMinutes(minutes[selectedMinuteIndex]);
        startTime.setSeconds(0);
        startTime.setMilliseconds(0);
      } else {
        // For duration mode, use current time
        startTime = new Date();
        startTime.setSeconds(0);
        startTime.setMilliseconds(0);
      }
      
      const selectedDuration = durations[selectedDurationIndex].minutes;
      const endTime = new Date(startTime.getTime() + selectedDuration * 60000);
      
      // Validate times
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error('Invalid date calculation:', {
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          selectedDateIndex,
          selectedHourIndex,
          selectedMinuteIndex,
          selectedDurationIndex
        });
        return;
      }
      
      console.log('Time confirmed:', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: selectedDuration
      })
      
      onConfirm(startTime, endTime);
      onClose();
    } catch (error) {
      console.error('Error in handleConfirm:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      const newTab = getInitialTab();
      setActiveTab(newTab);
      
      // 初期スクロール位置を設定
      setTimeout(() => {
        if (newTab === 'duration') {
          scrollToIndex(durationScrollRef, selectedDurationIndex);
        } else {
          scrollToIndex(dateScrollRef, selectedDateIndex);
          scrollToIndex(hourScrollRef, selectedHourIndex);
          scrollToIndex(minuteScrollRef, selectedMinuteIndex);
        }
      }, 100);
    }
  }, [visible, mode]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <BlurView intensity={20} style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayTouch} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </BlurView>
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          
          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'entry' && styles.activeTab]}
              onPress={() => setActiveTab('entry')}
            >
              <Text style={[styles.tabText, activeTab === 'entry' && styles.activeTabText]}>
                入庫日時
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'duration' && styles.activeTab]}
              onPress={() => setActiveTab('duration')}
            >
              <Text style={[styles.tabText, activeTab === 'duration' && styles.activeTabText]}>
                駐車時間
              </Text>
            </TouchableOpacity>
          </View>
          
          {activeTab === 'entry' && (
            <TouchableOpacity onPress={setToCurrentTime} style={styles.currentTimeButton}>
              <Text style={styles.currentTimeText}>現在時刻</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmText}>設定</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'duration' ? (
          // 駐車時間タブ
          <View style={styles.content}>
            <View style={styles.pickerWrapper}>
              {/* Selection highlight */}
              <View style={styles.selectionHighlight} />
              
              <ScrollView
                ref={durationScrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onScroll={(e) => handleScroll(e, setSelectedDurationIndex, durations.length - 1)}
                onMomentumScrollEnd={(e) => handleScrollEnd(e, durationScrollRef, setSelectedDurationIndex, durations.length - 1)}
                scrollEventThrottle={16}
              >
                {durations.map((item, index) => (
                  <TouchableOpacity
                    key={item.minutes}
                    style={styles.itemContainer}
                    onPress={() => {
                      setSelectedDurationIndex(index);
                      scrollToIndex(durationScrollRef, index);
                    }}
                  >
                    <Text style={[
                      styles.durationLabel,
                      index === selectedDurationIndex && styles.selectedDurationLabel
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={[
                      styles.durationTime,
                      index === selectedDurationIndex && styles.selectedDurationTime
                    ]}>
                      {calculateEndTime(item.minutes)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          // 入庫日時タブ
          <View style={styles.content}>
            <View style={styles.entryPickerWrapper}>
              {/* Selection highlight */}
              <View style={styles.selectionHighlight} />
              
              <View style={styles.pickersRow}>
                {/* Date Picker */}
                <View style={styles.datePickerColumn}>
                  <ScrollView
                    ref={dateScrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={(e) => handleScroll(e, setSelectedDateIndex, dates.length - 1)}
                    onMomentumScrollEnd={(e) => handleScrollEnd(e, dateScrollRef, setSelectedDateIndex, dates.length - 1)}
                    scrollEventThrottle={16}
                  >
                    {dates.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dateItem}
                        onPress={() => {
                          setSelectedDateIndex(index);
                          scrollToIndex(dateScrollRef, index);
                        }}
                      >
                        <Text style={[
                          styles.dateText,
                          index === selectedDateIndex && styles.selectedDateText
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Hour Picker */}
                <View style={styles.timePickerColumn}>
                  <ScrollView
                    ref={hourScrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={(e) => handleScroll(e, setSelectedHourIndex, hours.length - 1)}
                    onMomentumScrollEnd={(e) => handleScrollEnd(e, hourScrollRef, setSelectedHourIndex, hours.length - 1)}
                    scrollEventThrottle={16}
                  >
                    {hours.map((hour, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.timeItem}
                        onPress={() => {
                          setSelectedHourIndex(index);
                          scrollToIndex(hourScrollRef, index);
                        }}
                      >
                        <Text style={[
                          styles.timeText,
                          index === selectedHourIndex && styles.selectedTimeText
                        ]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Minute Picker */}
                <View style={styles.timePickerColumn}>
                  <ScrollView
                    ref={minuteScrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={(e) => handleScroll(e, setSelectedMinuteIndex, minutes.length - 1)}
                    onMomentumScrollEnd={(e) => handleScrollEnd(e, minuteScrollRef, setSelectedMinuteIndex, minutes.length - 1)}
                    scrollEventThrottle={16}
                  >
                    {minutes.map((minute, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.timeItem}
                        onPress={() => {
                          setSelectedMinuteIndex(index);
                          scrollToIndex(minuteScrollRef, index);
                        }}
                      >
                        <Text style={[
                          styles.timeText,
                          index === selectedMinuteIndex && styles.selectedTimeText
                        ]}>
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTouch: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: PANEL_HEIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  closeText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '300',
  },
  currentTimeButton: {
    padding: 4,
    marginRight: 8,
  },
  currentTimeText: {
    fontSize: 15,
    color: '#007AFF',
  },
  confirmButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  confirmText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 9,
    padding: 2,
    flex: 1,
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 7,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000000',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Picker wrapper
  pickerWrapper: {
    flex: 1,
    position: 'relative',
    paddingVertical: 20,
  },
  entryPickerWrapper: {
    flex: 1,
    position: 'relative',
    paddingVertical: 20,
  },
  
  // Selection highlight
  selectionHighlight: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    marginTop: -ITEM_HEIGHT / 2 + 18,
    zIndex: 1,
    pointerEvents: 'none' as 'none',
  },
  
  // Scroll views
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: (PANEL_HEIGHT - 100) / 2 - ITEM_HEIGHT / 2,
  },
  
  // Picker columns
  pickersRow: {
    flexDirection: 'row',
    flex: 1,
  },
  datePickerColumn: {
    flex: 2.5,
  },
  timePickerColumn: {
    flex: 1,
  },
  
  // Duration items
  itemContainer: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  durationLabel: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
  },
  selectedDurationLabel: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
  },
  durationTime: {
    fontSize: 14,
    color: '#C7C7CC',
  },
  selectedDurationTime: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
  
  // Entry date/time items
  dateItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  selectedDateText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  timeItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 20,
    color: '#8E8E93',
    fontWeight: '400',
  },
  selectedTimeText: {
    fontSize: 22,
    color: '#000000',
    fontWeight: '600',
  },
});