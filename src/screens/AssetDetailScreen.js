import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAssetById, getSystemById, getWarrantyStatus, getConditionColor } from '../data/hotelAssets';
import {
  calculateAIReplacementValue,
  getReplacementPriority,
  formatCurrencyFull,
} from '../utils/aiEngine';

export default function AssetDetailScreen({ route, navigation }) {
  const { assetId } = route.params;
  const asset = getAssetById(assetId);
  const insets = useSafeAreaInsets();

  if (!asset) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Asset not found</Text>
      </View>
    );
  }

  const system = getSystemById(asset.systemId);
  const warranty = getWarrantyStatus(asset.warrantyExpiration);
  const priority = getReplacementPriority(asset);
  const aiValue = calculateAIReplacementValue(asset);
  const conditionColor = getConditionColor(asset.condition);

  const yearsOld = ((new Date() - new Date(asset.installDate)) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
  const inflationAdjust = ((aiValue - asset.aiReplacementValue) / asset.aiReplacementValue * 100).toFixed(1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Asset Detail</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '22', borderColor: priority.color + '55' }]}>
          <Text style={[styles.priorityBadgeText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Asset Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.identityTop}>
            <View style={[styles.systemBadge, { backgroundColor: system?.color + '20' }]}>
              <Ionicons name={system?.icon} size={20} color={system?.color} />
              <Text style={[styles.systemBadgeText, { color: system?.color }]}>{system?.name}</Text>
            </View>
            <View style={[styles.warrantyBadge, { backgroundColor: warranty.color + '22' }]}>
              <Ionicons name="shield-checkmark-outline" size={12} color={warranty.color} />
              <Text style={[styles.warrantyText, { color: warranty.color }]}>{warranty.label}</Text>
            </View>
          </View>

          <Text style={styles.assetTypeLarge}>{asset.assetType}</Text>
          <Text style={styles.assetLocation}>
            <Ionicons name="location-outline" size={13} color="#636E72" /> {asset.location}
          </Text>
        </View>

        {/* AI Valuation Block */}
        <View style={styles.aiBlock}>
          <View style={styles.aiBlockHeader}>
            <Ionicons name="sparkles" size={16} color="#74B9FF" />
            <Text style={styles.aiBlockTitle}>AI Replacement Value Analysis</Text>
          </View>
          <View style={styles.aiValueRow}>
            <View style={styles.aiValueMain}>
              <Text style={styles.aiValueLabel}>Current Estimated Value</Text>
              <Text style={styles.aiValueAmount}>{formatCurrencyFull(aiValue)}</Text>
            </View>
            <View style={styles.aiValueMeta}>
              <Text style={styles.aiMetaLabel}>Inflation Adj.</Text>
              <Text style={styles.aiMetaValue}>+{inflationAdjust}%</Text>
              <Text style={styles.aiMetaLabel}>Age</Text>
              <Text style={styles.aiMetaValue}>{yearsOld} yrs</Text>
            </View>
          </View>
          <View style={styles.aiBreakdown}>
            <AIBreakdownItem label="Base Value (Install)" value={formatCurrencyFull(asset.aiReplacementValue)} />
            <AIBreakdownItem
              label="Inflation Adjustment"
              value={`+${formatCurrencyFull(aiValue - asset.aiReplacementValue)}`}
              valueColor="#FFA502"
            />
            <AIBreakdownItem label="Current AI Estimate" value={formatCurrencyFull(aiValue)} valueColor="#74B9FF" bold />
          </View>
        </View>

        {/* Primary Details */}
        <SectionHeader title="Asset Information" icon="information-circle-outline" />
        <View style={styles.detailCard}>
          <DetailRow label="Asset Type" value={asset.assetType} />
          <DetailRow label="Manufacturer" value={asset.manufacturer} />
          <DetailRow label="Model" value={asset.model} />
          <DetailRow label="Serial Number" value={asset.serialNumber} mono />
          <DetailRow label="Location" value={asset.location} />
          <DetailRow label="Install Date" value={formatDate(asset.installDate)} />
          <DetailRow
            label="Condition"
            value={asset.condition}
            valueColor={conditionColor}
            valueBold
          />
        </View>

        {/* Warranty */}
        <SectionHeader title="Warranty" icon="shield-outline" />
        <View style={styles.detailCard}>
          <DetailRow
            label="Warranty Expiration"
            value={formatDate(asset.warrantyExpiration)}
            valueColor={warranty.color}
          />
          <DetailRow label="Status" value={warranty.label} valueColor={warranty.color} />
        </View>

        {/* Service & Contract */}
        <SectionHeader title="Service & Contract" icon="build-outline" />
        <View style={styles.detailCard}>
          <DetailRow label="Service Vendor" value={asset.serviceVendor} />
          <DetailRow
            label="Contract Amount"
            value={formatCurrencyFull(asset.serviceContractAmount)}
            valueColor="#A29BFE"
            valueBold
          />
          <DetailRow label="Contract Frequency" value={asset.contractFrequency} />
          <DetailRow label="Last Service" value={formatDate(asset.lastServiceDate)} />
          <DetailRow label="Next Service" value={formatDate(asset.nextServiceDate)} />
        </View>

        {/* Replacement Planning */}
        <SectionHeader title="Replacement Planning" icon="repeat-outline" />
        <View style={styles.detailCard}>
          <DetailRow
            label="Replacement Priority"
            value={priority.label}
            valueColor={priority.color}
            valueBold
          />
          <DetailRow label="Priority Score" value={`${priority.score}/85`} />
          <DetailRow
            label="Replacement Value"
            value={formatCurrencyFull(aiValue)}
            valueColor="#74B9FF"
            valueBold
          />
          <DetailRow label="Value Source" value="AI Engine v2.4 (2026 Market Data)" />
        </View>

        {/* Notes */}
        {asset.notes && (
          <>
            <SectionHeader title="Notes" icon="document-text-outline" />
            <View style={[styles.detailCard, styles.notesCard]}>
              <Text style={styles.notesText}>{asset.notes}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={15} color="#636E72" />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function DetailRow({ label, value, valueColor, valueBold, mono }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          valueColor ? { color: valueColor } : null,
          valueBold ? { fontWeight: '700' } : null,
          mono ? { fontFamily: 'monospace', fontSize: 12 } : null,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function AIBreakdownItem({ label, value, valueColor, bold }) {
  return (
    <View style={styles.aiBreakdownRow}>
      <Text style={styles.aiBreakdownLabel}>{label}</Text>
      <Text style={[styles.aiBreakdownValue, valueColor ? { color: valueColor } : null, bold ? { fontWeight: '800' } : null]}>
        {value}
      </Text>
    </View>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  errorText: {
    color: '#FF4757',
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2330',
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  identityCard: {
    margin: 16,
    backgroundColor: '#1E2330',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2D3447',
  },
  identityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  systemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  warrantyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  warrantyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  assetTypeLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  assetLocation: {
    fontSize: 13,
    color: '#636E72',
  },
  aiBlock: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#0D1526',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  aiBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  aiBlockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  aiValueMain: {
    flex: 1,
  },
  aiValueLabel: {
    fontSize: 11,
    color: '#636E72',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aiValueAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#74B9FF',
  },
  aiValueMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  aiMetaLabel: {
    fontSize: 10,
    color: '#636E72',
  },
  aiMetaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFA502',
  },
  aiBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
    paddingTop: 12,
    gap: 8,
  },
  aiBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBreakdownLabel: {
    fontSize: 12,
    color: '#636E72',
  },
  aiBreakdownValue: {
    fontSize: 13,
    color: '#B2BEC3',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailCard: {
    marginHorizontal: 16,
    backgroundColor: '#1E2330',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3447',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3447',
  },
  detailLabel: {
    fontSize: 13,
    color: '#636E72',
    flex: 0.9,
  },
  detailValue: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  notesCard: {
    padding: 16,
  },
  notesText: {
    fontSize: 13,
    color: '#B2BEC3',
    lineHeight: 20,
  },
});
