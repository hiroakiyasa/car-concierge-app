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
const ITEM_HEIGHT = 40;

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
  // モードに応じて適切なタブを初期値に設定
  const getInitialTab = () => {
    if (mode === 'entry') return 'entry';
    if (mode === 'exit' || mode === 'duration') return 'duration';
    return 'duration';
  };
  
  const [activeTab, setActiveTab] = useState<'entry' | 'duration'>(getInitialTab());
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(2); // デフォルト30分
  
  // 入庫日時の独立した状態 - 現在時刻をデフォルトに
  const now = new Date();
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedHourIndex, setSelectedHourIndex] = useState(now.getHours());
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(now.getMinutes());
  
  const durationScrollRef = useRef<ScrollView>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // 駐車時間オプション（48時間まで対応）
  // 1時間まで: 10分ごと
  // 24時間まで: 30分単位
  // 48時間まで: 1時間ごと
  const durations = [
    // 1時間まで（10分ごと）
    { minutes: 10, label: '10分間' },
    { minutes: 20, label: '20分間' },
    { minutes: 30, label: '30分間' },
    { minutes: 40, label: '40分間' },
    { minutes: 50, label: '50分間' },
    { minutes: 60, label: '1時間' },
    // 24時間まで（30分単位）
    { minutes: 90, label: '1時間30分' },
    { minutes: 120, label: '2時間' },
    { minutes: 150, label: '2時間30分' },
    { minutes: 180, label: '3時間' },
    { minutes: 210, label: '3時間30分' },
    { minutes: 240, label: '4時間' },
    { minutes: 270, label: '4時間30分' },
    { minutes: 300, label: '5時間' },
    { minutes: 330, label: '5時間30分' },
    { minutes: 360, label: '6時間' },
    { minutes: 390, label: '6時間30分' },
    { minutes: 420, label: '7時間' },
    { minutes: 450, label: '7時間30分' },
    { minutes: 480, label: '8時間' },
    { minutes: 510, label: '8時間30分' },
    { minutes: 540, label: '9時間' },
    { minutes: 570, label: '9時間30分' },
    { minutes: 600, label: '10時間' },
    { minutes: 630, label: '10時間30分' },
    { minutes: 660, label: '11時間' },
    { minutes: 690, label: '11時間30分' },
    { minutes: 720, label: '12時間' },
    { minutes: 750, label: '12時間30分' },
    { minutes: 780, label: '13時間' },
    { minutes: 810, label: '13時間30分' },
    { minutes: 840, label: '14時間' },
    { minutes: 870, label: '14時間30分' },
    { minutes: 900, label: '15時間' },
    { minutes: 930, label: '15時間30分' },
    { minutes: 960, label: '16時間' },
    { minutes: 990, label: '16時間30分' },
    { minutes: 1020, label: '17時間' },
    { minutes: 1050, label: '17時間30分' },
    { minutes: 1080, label: '18時間' },
    { minutes: 1110, label: '18時間30分' },
    { minutes: 1140, label: '19時間' },
    { minutes: 1170, label: '19時間30分' },
    { minutes: 1200, label: '20時間' },
    { minutes: 1230, label: '20時間30分' },
    { minutes: 1260, label: '21時間' },
    { minutes: 1290, label: '21時間30分' },
    { minutes: 1320, label: '22時間' },
    { minutes: 1350, label: '22時間30分' },
    { minutes: 1380, label: '23時間' },
    { minutes: 1410, label: '23時間30分' },
    { minutes: 1440, label: '24時間' },
    // 48時間まで（1時間ごと）
    { minutes: 1500, label: '25時間' },
    { minutes: 1560, label: '26時間' },
    { minutes: 1620, label: '27時間' },
    { minutes: 1680, label: '28時間' },
    { minutes: 1740, label: '29時間' },
    { minutes: 1800, label: '30時間' },
    { minutes: 1860, label: '31時間' },
    { minutes: 1920, label: '32時間' },
    { minutes: 1980, label: '33時間' },
    { minutes: 2040, label: '34時間' },
    { minutes: 2100, label: '35時間' },
    { minutes: 2160, label: '36時間' },
    { minutes: 2220, label: '37時間' },
    { minutes: 2280, label: '38時間' },
    { minutes: 2340, label: '39時間' },
    { minutes: 2400, label: '40時間' },
    { minutes: 2460, label: '41時間' },
    { minutes: 2520, label: '42時間' },
    { minutes: 2580, label: '43時間' },
    { minutes: 2640, label: '44時間' },
    { minutes: 2700, label: '45時間' },
    { minutes: 2760, label: '46時間' },
    { minutes: 2820, label: '47時間' },
    { minutes: 2880, label: '48時間' },
  ];

  // 日付オプション（今日から7日間）
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekday = weekdays[date.getDay()];
      
      dates.push({
        label: `${month}月${day}日 ${weekday}`,
        month,
        day,
        weekday,
        date: date
      });
    }
    return dates;
  };

  const dates = generateDates();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const calculateEndTime = (durationMinutes: number) => {
    const startTime = new Date();
    // 現在時刻を基準にする
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    
    const month = endTime.getMonth() + 1;
    const day = endTime.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[endTime.getDay()];
    const hour = endTime.getHours();
    const minute = endTime.getMinutes();
    
    return `〜${month}月${day}日 ${weekday} ${hour}:${minute.toString().padStart(2, '0')}`;
  };

  const setToCurrentTime = () => {
    const now = new Date();
    
    // 今日の日付のインデックスを見つける（必ず0になるはず）
    setSelectedDateIndex(0);
    setSelectedHourIndex(now.getHours());
    setSelectedMinuteIndex(now.getMinutes());
    
    // スクロール位置を更新 - 選択したアイテムを中央に配置
    // 灰色のハイライトは画面中央にあるので、選択したアイテムを中央に持ってくる
    // scrollY = (index * ITEM_HEIGHT) - (中央までのオフセット)
    // 中央までのオフセット = 1.5 * ITEM_HEIGHT (上のパディング分)
    setTimeout(() => {
      if (dateScrollRef.current) {
        // Index 0 を中央に配置（最初のアイテムなので特別処理）
        dateScrollRef.current.scrollTo({ y: 0, animated: true });
      }
      if (hourScrollRef.current) {
        // 選択した時間を中央に配置
        const hourOffset = now.getHours() * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT;
        hourScrollRef.current.scrollTo({ y: Math.max(0, hourOffset), animated: true });
      }
      if (minuteScrollRef.current) {
        // 選択した分を中央に配置
        const minuteOffset = now.getMinutes() * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT;
        minuteScrollRef.current.scrollTo({ y: Math.max(0, minuteOffset), animated: true });
      }
    }, 50);
  };

  const handleDurationScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // Calculate which item is at the center of the gray highlight
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < durations.length) {
      setSelectedDurationIndex(index);
    }
  };
  
  const handleDurationScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < durations.length && durationScrollRef.current) {
      // 正確な位置にスナップ
      durationScrollRef.current.scrollTo({
        y: Math.max(0, index * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT),
        animated: true
      });
      setSelectedDurationIndex(index);
    }
  };

  const handleDateScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < dates.length) {
      setSelectedDateIndex(index);
    }
  };
  
  const handleDateScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < dates.length && dateScrollRef.current) {
      dateScrollRef.current.scrollTo({
        y: Math.max(0, index * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT),
        animated: true
      });
      setSelectedDateIndex(index);
    }
  };

  const handleHourScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < hours.length) {
      setSelectedHourIndex(index);
    }
  };
  
  const handleHourScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < hours.length && hourScrollRef.current) {
      hourScrollRef.current.scrollTo({
        y: Math.max(0, index * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT),
        animated: true
      });
      setSelectedHourIndex(index);
    }
  };

  const handleMinuteScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < minutes.length) {
      setSelectedMinuteIndex(index);
    }
  };
  
  const handleMinuteScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round((offsetY + 1.5 * ITEM_HEIGHT) / ITEM_HEIGHT);
    if (index >= 0 && index < minutes.length && minuteScrollRef.current) {
      minuteScrollRef.current.scrollTo({
        y: Math.max(0, index * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT),
        animated: true
      });
      setSelectedMinuteIndex(index);
    }
  };

  const handleConfirm = () => {
    let startTime: Date;
    
    if (activeTab === 'entry') {
      const selectedDate = dates[selectedDateIndex].date;
      startTime = new Date(selectedDate);
      startTime.setHours(hours[selectedHourIndex]);
      startTime.setMinutes(minutes[selectedMinuteIndex]);
    } else {
      startTime = new Date();
    }
    
    const selectedDuration = durations[selectedDurationIndex].minutes;
    const endTime = new Date(startTime.getTime() + selectedDuration * 60000);
    onConfirm(startTime, endTime);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      // モードに応じて適切なタブを設定
      const newTab = getInitialTab();
      setActiveTab(newTab);
      
      // 初回表示時に現在時刻を設定
      if (newTab === 'entry') {
        const currentTime = new Date();
        setSelectedDateIndex(0);
        setSelectedHourIndex(currentTime.getHours());
        setSelectedMinuteIndex(currentTime.getMinutes());
      }
      
      setTimeout(() => {
        if (newTab === 'duration' && durationScrollRef.current) {
          // 選択したアイテムを中央に配置
          const offset = selectedDurationIndex * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT;
          durationScrollRef.current.scrollTo({ 
            y: Math.max(0, offset), 
            animated: false 
          });
        } else if (newTab === 'entry') {
          if (dateScrollRef.current) {
            // 選択したアイテムを中央に配置
            const offset = selectedDateIndex * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT;
            dateScrollRef.current.scrollTo({ 
              y: Math.max(0, offset), 
              animated: false 
            });
          }
          if (hourScrollRef.current) {
            // 選択したアイテムを中央に配置
            const offset = selectedHourIndex * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT;
            hourScrollRef.current.scrollTo({ 
              y: Math.max(0, offset), 
              animated: false 
            });
          }
          if (minuteScrollRef.current) {
            // 選択したアイテムを中央に配置
            const offset = selectedMinuteIndex * ITEM_HEIGHT - 1.5 * ITEM_HEIGHT;
            minuteScrollRef.current.scrollTo({ 
              y: Math.max(0, offset), 
              animated: false 
            });
          }
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
            <TouchableOpacity style={styles.currentTimeButton} onPress={setToCurrentTime}>
              <Text style={styles.currentTimeButtonText}>現在時刻</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmText}>完了</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'duration' ? (
          // 駐車時間タブ
          <View style={styles.content}>
            <View style={styles.pickerContainer}>
              {/* Selection highlight */}
              <View style={styles.selectionHighlight} />
              
              <ScrollView
                ref={durationScrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onScroll={handleDurationScroll}
                onMomentumScrollEnd={handleDurationScrollEnd}
                scrollEventThrottle={16}
              >
                <View style={{ height: ITEM_HEIGHT * 1.5 }} />
                {durations.map((item, index) => (
                  <View key={item.minutes} style={styles.itemContainer}>
                    <Text style={[
                      styles.durationLabel,
                      index === selectedDurationIndex && styles.selectedText
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={[
                      styles.durationTime,
                      index === selectedDurationIndex && styles.selectedTime
                    ]}>
                      {calculateEndTime(item.minutes)}
                    </Text>
                  </View>
                ))}
                <View style={{ height: ITEM_HEIGHT * 1.5 }} />
              </ScrollView>
            </View>
            
            {/* Bottom indicator */}
            <View style={styles.bottomIndicator} />
          </View>
        ) : (
          // 入庫日時タブ
          <View style={styles.content}>
            <View style={styles.entryPickerContainer}>
              {/* Selection highlight */}
              <View style={styles.selectionHighlight} />
              
              <View style={styles.pickersRow}>
                {/* Date Picker */}
                <View style={styles.pickerColumn}>
                  <ScrollView
                    ref={dateScrollRef}
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={handleDateScroll}
                    onMomentumScrollEnd={handleDateScrollEnd}
                    scrollEventThrottle={16}
                  >
                    <View style={{ height: ITEM_HEIGHT * 1.5 }} />
                    {dates.map((item, index) => (
                      <View key={index} style={styles.entryItem}>
                        <Text style={[
                          styles.entryDateText,
                          index === selectedDateIndex && styles.selectedText
                        ]}>
                          {item.label}
                        </Text>
                      </View>
                    ))}
                    <View style={{ height: ITEM_HEIGHT * 1.5 }} />
                  </ScrollView>
                </View>
                
                {/* Hour Picker */}
                <View style={styles.timePickerColumn}>
                  <ScrollView
                    ref={hourScrollRef}
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={handleHourScroll}
                    onMomentumScrollEnd={handleHourScrollEnd}
                    scrollEventThrottle={16}
                  >
                    <View style={{ height: ITEM_HEIGHT * 1.5 }} />
                    {hours.map((hour, index) => (
                      <View key={index} style={styles.entryItem}>
                        <View style={styles.timeItemContainer}>
                          <Text style={[
                            styles.entryTimeText,
                            index === selectedHourIndex && styles.selectedTimeText
                          ]}>
                            {hour.toString().padStart(2, '0')}
                          </Text>
                          {index === selectedHourIndex && (
                            <Text style={styles.timeLabelText}>時</Text>
                          )}
                        </View>
                      </View>
                    ))}
                    <View style={{ height: ITEM_HEIGHT * 1.5 }} />
                  </ScrollView>
                </View>
                
                {/* Minute Picker */}
                <View style={styles.timePickerColumn}>
                  <ScrollView
                    ref={minuteScrollRef}
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={handleMinuteScroll}
                    onMomentumScrollEnd={handleMinuteScrollEnd}
                    scrollEventThrottle={16}
                  >
                    <View style={{ height: ITEM_HEIGHT * 1.5 }} />
                    {minutes.map((minute, index) => (
                      <View key={index} style={styles.entryItem}>
                        <View style={styles.timeItemContainer}>
                          <Text style={[
                            styles.entryTimeText,
                            index === selectedMinuteIndex && styles.selectedTimeText
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                          {index === selectedMinuteIndex && (
                            <Text style={styles.timeLabelText}>分</Text>
                          )}
                        </View>
                      </View>
                    ))}
                    <View style={{ height: ITEM_HEIGHT * 1.5 }} />
                  </ScrollView>
                </View>
              </View>
            </View>
            
            {/* Bottom indicator */}
            <View style={styles.bottomIndicator} />
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
    height: SCREEN_HEIGHT * 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    padding: 4,
    width: 36,
  },
  closeText: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '300',
  },
  confirmButton: {
    padding: 4,
    width: 36,
    alignItems: 'flex-end',
  },
  confirmText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    flex: 1,
    marginHorizontal: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000000',
  },
  content: {
    backgroundColor: '#F2F2F7',
    flex: 1,
    position: 'relative',
  },
  
  // Current time button
  currentTimeButton: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    marginRight: 8,
  },
  currentTimeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Picker styles
  pickerContainer: {
    flex: 1,
    position: 'relative',
  },
  entryPickerContainer: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: 10,
  },
  pickersRow: {
    flexDirection: 'row',
    flex: 1,
  },
  pickerColumn: {
    flex: 2,
  },
  timePickerColumn: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  selectionHighlight: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
    marginTop: -ITEM_HEIGHT / 2,
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Duration tab styles
  itemContainer: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  durationLabel: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
  },
  durationTime: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  selectedText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 18,
  },
  selectedTime: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  
  // Entry time tab styles
  entryItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryDateText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  entryTimeText: {
    fontSize: 20,
    color: '#8E8E93',
    fontWeight: '400',
  },
  selectedTimeText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 24,
  },
  timeItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabelText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  
  // Bottom indicator
  bottomIndicator: {
    position: 'absolute',
    bottom: 10,
    left: '35%',
    right: '35%',
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 2,
  },
});