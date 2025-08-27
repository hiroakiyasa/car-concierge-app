import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { ParkingDuration } from '@/types';

interface ParkingTimeSelectorProps {
  duration: ParkingDuration;
  mode?: 'entry' | 'duration' | 'exit';
  onDurationChange: (duration: ParkingDuration) => void;
  visible: boolean;
  onClose: () => void;
}

export const ParkingTimeSelector: React.FC<ParkingTimeSelectorProps> = ({
  duration,
  mode = 'entry',
  onDurationChange,
  visible,
  onClose,
}) => {
  const [startDate, setStartDate] = useState(duration.startDate);
  const [endDate, setEndDate] = useState(duration.endDate);
  const [parkingHours, setParkingHours] = useState(Math.floor(duration.duration / 3600));
  const [parkingMinutes, setParkingMinutes] = useState((duration.duration % 3600) / 60);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeMode, setActiveMode] = useState(mode);

  const quickTimeOptions = [
    { label: '30分', hours: 0, minutes: 30 },
    { label: '1時間', hours: 1, minutes: 0 },
    { label: '2時間', hours: 2, minutes: 0 },
    { label: '3時間', hours: 3, minutes: 0 },
    { label: '6時間', hours: 6, minutes: 0 },
    { label: '12時間', hours: 12, minutes: 0 },
    { label: '24時間', hours: 24, minutes: 0 },
  ];

  const handleQuickTimeSelect = (hours: number, minutes: number) => {
    updateFromDuration(hours, minutes);
  };

  const updateFromEntry = (newStartDate: Date, hours: number, minutes: number) => {
    const totalSeconds = (hours * 3600) + (minutes * 60);
    const newDuration: ParkingDuration = {
      startDate: newStartDate,
      duration: totalSeconds,
      get endDate() {
        return new Date(this.startDate.getTime() + this.duration * 1000);
      },
      get durationInMinutes() {
        return Math.round(this.duration / 60);
      },
      get formattedDuration() {
        const h = Math.floor(this.duration / 3600);
        const m = Math.floor((this.duration % 3600) / 60);
        if (h > 0) {
          return `${h}時間${m > 0 ? `${m}分` : ''}`;
        }
        return `${m}分`;
      },
    };
    setStartDate(newStartDate);
    setEndDate(new Date(newStartDate.getTime() + totalSeconds * 1000));
    onDurationChange(newDuration);
  };

  const updateFromExit = (newEndDate: Date) => {
    const diffMs = newEndDate.getTime() - startDate.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    const newDuration: ParkingDuration = {
      startDate: startDate,
      duration: totalSeconds,
      get endDate() {
        return new Date(this.startDate.getTime() + this.duration * 1000);
      },
      get durationInMinutes() {
        return Math.round(this.duration / 60);
      },
      get formattedDuration() {
        const h = Math.floor(this.duration / 3600);
        const m = Math.floor((this.duration % 3600) / 60);
        if (h > 0) {
          return `${h}時間${m > 0 ? `${m}分` : ''}`;
        }
        return `${m}分`;
      },
    };
    
    setEndDate(newEndDate);
    setParkingHours(hours);
    setParkingMinutes(minutes);
    onDurationChange(newDuration);
  };

  const updateFromDuration = (hours: number, minutes: number) => {
    const totalSeconds = (hours * 3600) + (minutes * 60);
    const newEndDate = new Date(startDate.getTime() + totalSeconds * 1000);
    
    const newDuration: ParkingDuration = {
      startDate: startDate,
      duration: totalSeconds,
      get endDate() {
        return new Date(this.startDate.getTime() + this.duration * 1000);
      },
      get durationInMinutes() {
        return Math.round(this.duration / 60);
      },
      get formattedDuration() {
        const h = Math.floor(this.duration / 3600);
        const m = Math.floor((this.duration % 3600) / 60);
        if (h > 0) {
          return `${h}時間${m > 0 ? `${m}分` : ''}`;
        }
        return `${m}分`;
      },
    };
    
    setParkingHours(hours);
    setParkingMinutes(minutes);
    setEndDate(newEndDate);
    onDurationChange(newDuration);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (activeMode === 'entry') {
        updateFromEntry(selectedDate, parkingHours, parkingMinutes);
      } else if (activeMode === 'exit') {
        const newEndDate = new Date(endDate);
        newEndDate.setFullYear(selectedDate.getFullYear());
        newEndDate.setMonth(selectedDate.getMonth());
        newEndDate.setDate(selectedDate.getDate());
        updateFromExit(newEndDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      if (activeMode === 'entry') {
        const newStartDate = new Date(startDate);
        newStartDate.setHours(selectedTime.getHours());
        newStartDate.setMinutes(selectedTime.getMinutes());
        updateFromEntry(newStartDate, parkingHours, parkingMinutes);
      } else if (activeMode === 'exit') {
        const newEndDate = new Date(endDate);
        newEndDate.setHours(selectedTime.getHours());
        newEndDate.setMinutes(selectedTime.getMinutes());
        updateFromExit(newEndDate);
      }
    }
  };

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return date.toLocaleString('ja-JP', options);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'entry' ? '入庫時間設定' : 
               mode === 'duration' ? '駐車時間設定' : 
               '出庫時間設定'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {mode === 'entry' && (
            <>
              {/* 入庫時間 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>入庫時間</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => { setActiveMode('entry'); setShowDatePicker(true); }}
                  >
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                    <Text style={styles.dateTimeText}>
                      {startDate.toLocaleDateString('ja-JP')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => { setActiveMode('entry'); setShowTimePicker(true); }}
                  >
                    <Ionicons name="time-outline" size={20} color={Colors.primary} />
                    <Text style={styles.dateTimeText}>
                      {startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>現在の設定</Text>
                <View style={styles.currentSettings}>
                  <Text style={styles.currentText}>駐車時間: {duration.formattedDuration}</Text>
                  <Text style={styles.currentText}>出庫予定: {formatDateTime(endDate)}</Text>
                </View>
              </View>
            </>
          )}

          {mode === 'duration' && (
            <>
              {/* 駐車時間 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>駐車時間を選択</Text>
                <View style={styles.quickTimeGrid}>
                  {quickTimeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.quickTimeButton,
                        (parkingHours === option.hours && parkingMinutes === option.minutes) &&
                        styles.quickTimeButtonActive
                      ]}
                      onPress={() => handleQuickTimeSelect(option.hours, option.minutes)}
                    >
                      <Text style={[
                        styles.quickTimeText,
                        (parkingHours === option.hours && parkingMinutes === option.minutes) &&
                        styles.quickTimeTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>現在の設定</Text>
                <View style={styles.currentSettings}>
                  <Text style={styles.currentText}>入庫時間: {formatDateTime(startDate)}</Text>
                  <Text style={styles.currentText}>出庫予定: {formatDateTime(endDate)}</Text>
                </View>
              </View>
            </>
          )}

          {mode === 'exit' && (
            <>
              {/* 出庫時間 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>出庫時間</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => { setActiveMode('exit'); setShowDatePicker(true); }}
                  >
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                    <Text style={styles.dateTimeText}>
                      {endDate.toLocaleDateString('ja-JP')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => { setActiveMode('exit'); setShowTimePicker(true); }}
                  >
                    <Ionicons name="time-outline" size={20} color={Colors.primary} />
                    <Text style={styles.dateTimeText}>
                      {endDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>現在の設定</Text>
                <View style={styles.currentSettings}>
                  <Text style={styles.currentText}>入庫時間: {formatDateTime(startDate)}</Text>
                  <Text style={styles.currentText}>駐車時間: {duration.formattedDuration}</Text>
                </View>
              </View>
            </>
          )}

          {/* 確定ボタン */}
          <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
            <Text style={styles.confirmButtonText}>設定する</Text>
          </TouchableOpacity>

          {/* Date/Time Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={activeMode === 'exit' ? endDate : startDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={activeMode === 'exit' ? endDate : startDate}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.medium,
    paddingBottom: Spacing.large,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: {
    fontSize: Typography.h5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  section: {
    marginTop: Spacing.large,
  },
  sectionTitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.small,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.small,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.small,
    padding: Spacing.medium,
    backgroundColor: Colors.background,
    borderRadius: Spacing.cornerRadius,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  dateTimeText: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  quickTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.small,
  },
  quickTimeButton: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    backgroundColor: Colors.background,
    borderRadius: Spacing.cornerRadius,
    borderWidth: 1,
    borderColor: Colors.divider,
    minWidth: 70,
    alignItems: 'center',
  },
  quickTimeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickTimeText: {
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
  },
  quickTimeTextActive: {
    color: Colors.white,
  },
  endTimeContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.background,
    borderRadius: Spacing.cornerRadius,
  },
  endTimeText: {
    fontSize: Typography.h6,
    color: Colors.primary,
    fontWeight: '600',
  },
  confirmButton: {
    marginTop: Spacing.large,
    backgroundColor: Colors.primary,
    padding: Spacing.medium,
    borderRadius: Spacing.cornerRadius,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: Typography.body,
    fontWeight: '600',
  },
  currentSettings: {
    padding: Spacing.medium,
    backgroundColor: Colors.background,
    borderRadius: Spacing.cornerRadius,
  },
  currentText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginVertical: 2,
  },
});