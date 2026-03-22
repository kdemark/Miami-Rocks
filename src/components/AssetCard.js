import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getWarrantyStatus,
  getConditionColor,
} from '../data/hotelAssets';
import { formatCurrency, getReplacementPriority } from '../utils/aiEngine';

export default function AssetCard({ asset, onPress, compact = false }) {
  const warranty = getWarrantyStatus(asset.warrantyExpiration);
  const priority = getReplacementPriority(asset);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.75}>
        <View style={[styles.priorityBar, { backgroundColor: priority.color }]} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>{asset.assetType}</Text>
          <Text style={styles.compactMfg}>{asset.manufacturer}</Text>
        </View>
        <View style={styles.compactRight}>
          <Text style={styles.compactValue}>{formatCurrency(asset.aiReplacementValue)}</Text>
          <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(asset.condition) + '22' }]}>
            <Text style={[styles.conditionText, { color: getConditionColor(asset.condition) }]}>
              {asset.condition}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#636E72" style={styles.chevron} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
          <Text style={styles.assetType} numberOfLines={2}>{asset.assetType}</Text>
        </View>
        <View style={[styles.warrantyBadge, { backgroundColor: warranty.color + '22' }]}>
          <Text style={[styles.warrantyText, { color: warranty.color }]}>{warranty.label}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoItem label="Manufacturer" value={asset.manufacturer} />
        <InfoItem label="Serial #" value={asset.serialNumber} />
        <InfoItem label="Location" value={asset.location} />
        <InfoItem label="Condition" value={asset.condition} valueColor={getConditionColor(asset.condition)} />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>AI Replacement Value</Text>
          <Text style={styles.replacementValue}>{formatCurrency(asset.aiReplacementValue)}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Service Contract</Text>
          <Text style={styles.contractValue}>
            {formatCurrency(asset.serviceContractAmount)}/{asset.contractFrequency === 'Annual' ? 'yr' : asset.contractFrequency === 'Monthly' ? 'mo' : asset.contractFrequency}
          </Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Replacement Priority</Text>
          <Text style={[styles.priorityLabel, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InfoItem({ label, value, valueColor }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2330',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D3447',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 2,
  },
  assetType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  warrantyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  warrantyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  infoItem: {
    width: '47%',
  },
  infoLabel: {
    fontSize: 10,
    color: '#636E72',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#B2BEC3',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    backgroundColor: '#161B27',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#2D3447',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerDivider: {
    width: 1,
    backgroundColor: '#2D3447',
    marginVertical: 2,
  },
  footerLabel: {
    fontSize: 9,
    color: '#636E72',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  replacementValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#74B9FF',
  },
  contractValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A29BFE',
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2330',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D3447',
  },
  priorityBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  compactContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactMfg: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  compactRight: {
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  compactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#74B9FF',
  },
  conditionBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    marginRight: 8,
  },
});
