import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HOTEL_SYSTEMS, ASSETS, getSystemStats, getWarrantyStatus } from '../data/hotelAssets';
import {
  formatCurrencyFull,
  formatCurrency,
  generateReplacementReport,
  getReplacementPriority,
} from '../utils/aiEngine';

export default function ReportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const report = useMemo(() => generateReplacementReport(ASSETS), []);

  const warrantyBreakdown = useMemo(() => {
    const counts = { expired: 0, expiring: 0, active: 0 };
    ASSETS.forEach((a) => {
      counts[getWarrantyStatus(a.warrantyExpiration).status]++;
    });
    return counts;
  }, []);

  const priorityBreakdown = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    ASSETS.forEach((a) => {
      counts[getReplacementPriority(a).label]++;
    });
    return counts;
  }, []);

  const systemValues = useMemo(() =>
    HOTEL_SYSTEMS.map((s) => {
      const stats = getSystemStats(s.id);
      return { ...s, ...stats };
    }).sort((a, b) => b.totalValue - a.totalValue),
    []
  );

  const topAssets = useMemo(() =>
    [...ASSETS].sort((a, b) => b.aiReplacementValue - a.aiReplacementValue).slice(0, 5),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio Report</Text>
        <View style={styles.reportDate}>
          <Text style={styles.reportDateText}>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        {/* Portfolio Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Portfolio Replacement Value</Text>
          <Text style={styles.summaryValue}>{formatCurrencyFull(report.totalCurrentValue)}</Text>
          <View style={styles.summaryRow}>
            <SummaryItem label="Assets" value={String(report.assetCount)} />
            <SummaryItem label="Systems" value={String(HOTEL_SYSTEMS.length)} />
            <SummaryItem label="Inflation Adj." value={`+${report.inflationPercent}%`} />
          </View>
        </View>

        {/* Warranty Status */}
        <SectionTitle title="Warranty Status" icon="shield-outline" />
        <View style={styles.rowCards}>
          <StatusCard label="Expired" value={warrantyBreakdown.expired} color="#FF4757" icon="alert-circle" />
          <StatusCard label="Expiring Soon" value={warrantyBreakdown.expiring} color="#FFA502" icon="warning" />
          <StatusCard label="Active" value={warrantyBreakdown.active} color="#2ED573" icon="checkmark-circle" />
        </View>

        {/* Replacement Priority */}
        <SectionTitle title="Replacement Priority" icon="repeat-outline" />
        <View style={styles.rowCards}>
          <StatusCard label="Critical" value={priorityBreakdown.Critical} color="#FF4757" icon="flame" />
          <StatusCard label="High" value={priorityBreakdown.High} color="#FFA502" icon="arrow-up-circle" />
          <StatusCard label="Medium" value={priorityBreakdown.Medium} color="#FFD93D" icon="remove-circle" />
          <StatusCard label="Low" value={priorityBreakdown.Low} color="#2ED573" icon="checkmark-circle" />
        </View>

        {/* Value by System */}
        <SectionTitle title="Value by System" icon="bar-chart-outline" />
        <View style={styles.systemValueList}>
          {systemValues.map((s) => {
            const pct = (s.totalValue / report.totalOriginalValue) * 100;
            return (
              <View key={s.id} style={styles.systemValueRow}>
                <View style={styles.systemValueLeft}>
                  <View style={[styles.systemColorDot, { backgroundColor: s.color }]} />
                  <Text style={styles.systemValueName}>{s.name}</Text>
                </View>
                <View style={styles.systemValueRight}>
                  <Text style={styles.systemValueAmt}>{formatCurrency(s.totalValue)}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: s.color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Top 5 Assets by Value */}
        <SectionTitle title="Top 5 Assets by Value" icon="trophy-outline" />
        <View style={styles.topAssetList}>
          {topAssets.map((asset, index) => {
            const system = HOTEL_SYSTEMS.find((s) => s.id === asset.systemId);
            return (
              <View key={asset.id} style={styles.topAssetRow}>
                <View style={styles.topAssetRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topAssetInfo}>
                  <Text style={styles.topAssetName} numberOfLines={1}>{asset.assetType}</Text>
                  <Text style={styles.topAssetSys}>{system?.name} · {asset.manufacturer}</Text>
                </View>
                <Text style={styles.topAssetValue}>{formatCurrency(asset.aiReplacementValue)}</Text>
              </View>
            );
          })}
        </View>

        {/* Annual Contract Costs */}
        <SectionTitle title="Annual Service Contracts" icon="document-text-outline" />
        <View style={styles.contractSummary}>
          <View style={styles.contractRow}>
            <Text style={styles.contractLabel}>Total Annual Contract Cost</Text>
            <Text style={styles.contractTotal}>
              {formatCurrencyFull(ASSETS.reduce((s, a) => {
                const mult = a.contractFrequency === 'Monthly' ? 12
                  : a.contractFrequency === 'Quarterly' ? 4
                  : a.contractFrequency === 'Semi-Annual' ? 2 : 1;
                return s + (a.serviceContractAmount * mult);
              }, 0))}
            </Text>
          </View>
          <Text style={styles.contractNote}>
            * Monthly and quarterly contracts annualized for comparison
          </Text>
        </View>

        <View style={styles.footer}>
          <Ionicons name="sparkles" size={14} color="#636E72" />
          <Text style={styles.footerText}>
            Values generated by AI Engine using 2026 market data, inflation modeling, and condition scoring.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={15} color="#636E72" />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function SummaryItem({ label, value }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemValue}>{value}</Text>
      <Text style={styles.summaryItemLabel}>{label}</Text>
    </View>
  );
}

function StatusCard({ label, value, color, icon }) {
  return (
    <View style={[styles.statusCard, { borderColor: color + '44' }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
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
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reportDate: {
    backgroundColor: '#1E2330',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D3447',
  },
  reportDateText: {
    fontSize: 12,
    color: '#636E72',
  },
  summaryCard: {
    margin: 16,
    backgroundColor: '#0D1526',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#636E72',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#74B9FF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 24,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryItemLabel: {
    fontSize: 11,
    color: '#636E72',
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#1E2330',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 10,
    color: '#636E72',
    textAlign: 'center',
  },
  systemValueList: {
    marginHorizontal: 16,
    backgroundColor: '#1E2330',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D3447',
    gap: 12,
    marginBottom: 8,
  },
  systemValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  systemValueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
    gap: 8,
  },
  systemColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  systemValueName: {
    fontSize: 12,
    color: '#B2BEC3',
  },
  systemValueRight: {
    flex: 1,
    gap: 4,
  },
  systemValueAmt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#74B9FF',
    textAlign: 'right',
  },
  barBg: {
    height: 4,
    backgroundColor: '#2D3447',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  topAssetList: {
    marginHorizontal: 16,
    backgroundColor: '#1E2330',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3447',
    overflow: 'hidden',
    marginBottom: 8,
  },
  topAssetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3447',
    gap: 12,
  },
  topAssetRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D3447',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#636E72',
  },
  topAssetInfo: {
    flex: 1,
  },
  topAssetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topAssetSys: {
    fontSize: 11,
    color: '#636E72',
    marginTop: 2,
  },
  topAssetValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#74B9FF',
  },
  contractSummary: {
    marginHorizontal: 16,
    backgroundColor: '#1E2330',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D3447',
    marginBottom: 8,
  },
  contractRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractLabel: {
    fontSize: 13,
    color: '#B2BEC3',
  },
  contractTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#A29BFE',
  },
  contractNote: {
    fontSize: 11,
    color: '#636E72',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    color: '#636E72',
    lineHeight: 16,
  },
});
