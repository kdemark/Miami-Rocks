import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HOTEL_SYSTEMS, ASSETS, getSystemStats, getTotalReplacementValue } from '../data/hotelAssets';
import { formatCurrency, formatCurrencyFull, generateReplacementReport } from '../utils/aiEngine';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const report = useMemo(() => generateReplacementReport(ASSETS), []);
  const totalValue = getTotalReplacementValue();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F1A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hotelName}>Miami Rocks Hotel</Text>
          <Text style={styles.headerSub}>Asset Management System</Text>
        </View>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => navigation.navigate('Report')}
        >
          <Ionicons name="bar-chart-outline" size={20} color="#74B9FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* KPI Banner */}
        <View style={styles.kpiBanner}>
          <KPICard
            label="Total Assets"
            value={String(ASSETS.length)}
            icon="cube-outline"
            color="#74B9FF"
          />
          <KPICard
            label="Portfolio Value"
            value={formatCurrency(totalValue)}
            icon="trending-up-outline"
            color="#A29BFE"
            wide
          />
          <KPICard
            label="Systems"
            value={String(HOTEL_SYSTEMS.length)}
            icon="grid-outline"
            color="#FD79A8"
          />
        </View>

        {/* AI Engine Summary */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <Ionicons name="sparkles" size={18} color="#74B9FF" />
            <Text style={styles.aiCardTitle}>AI Valuation Engine</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.aiCardDesc}>
            Replacement values are continuously adjusted using market pricing data,
            age-based depreciation, condition scoring, and 4.2% annual inflation modeling.
          </Text>
          <View style={styles.aiStats}>
            <AIStat label="Inflation Impact" value={`+${report.inflationPercent}%`} color="#FFA502" />
            <AIStat label="Adjusted Portfolio" value={formatCurrency(report.totalCurrentValue)} color="#2ED573" />
          </View>
        </View>

        {/* Systems Grid */}
        <Text style={styles.sectionTitle}>Building Systems</Text>
        <View style={styles.systemsGrid}>
          {HOTEL_SYSTEMS.map((system) => {
            const stats = getSystemStats(system.id);
            return (
              <SystemCard
                key={system.id}
                system={system}
                stats={stats}
                onPress={() => navigation.navigate('SystemAssets', {
                  systemId: system.id,
                  systemName: system.name,
                })}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function KPICard({ label, value, icon, color, wide }) {
  return (
    <View style={[styles.kpiCard, wide && styles.kpiCardWide]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function AIStat({ label, value, color }) {
  return (
    <View style={styles.aiStatItem}>
      <Text style={[styles.aiStatValue, { color }]}>{value}</Text>
      <Text style={styles.aiStatLabel}>{label}</Text>
    </View>
  );
}

function SystemCard({ system, stats, onPress }) {
  return (
    <TouchableOpacity style={styles.systemCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.systemIconBg, { backgroundColor: system.color + '20' }]}>
        <Ionicons name={system.icon} size={26} color={system.color} />
      </View>
      <Text style={styles.systemName}>{system.name}</Text>
      <Text style={styles.systemDesc} numberOfLines={2}>{system.description}</Text>
      <View style={styles.systemStats}>
        <Text style={styles.systemCount}>{stats.count} assets</Text>
        <Text style={styles.systemValue}>{formatCurrency(stats.totalValue)}</Text>
      </View>
      <View style={[styles.systemAccent, { backgroundColor: system.color }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2330',
  },
  hotelName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  reportBtn: {
    padding: 10,
    backgroundColor: '#1E2330',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3447',
  },
  kpiBanner: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1E2330',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3447',
  },
  kpiCardWide: {
    flex: 1.4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 10,
    color: '#636E72',
    marginTop: 2,
    textAlign: 'center',
  },
  aiCard: {
    margin: 16,
    backgroundColor: '#0D1526',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aiCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  aiBadge: {
    backgroundColor: '#74B9FF22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#74B9FF44',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#74B9FF',
    letterSpacing: 1,
  },
  aiCardDesc: {
    fontSize: 12,
    color: '#636E72',
    lineHeight: 18,
    marginBottom: 12,
  },
  aiStats: {
    flexDirection: 'row',
    gap: 20,
  },
  aiStatItem: {
    alignItems: 'flex-start',
  },
  aiStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  aiStatLabel: {
    fontSize: 10,
    color: '#636E72',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  systemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  systemCard: {
    width: '46%',
    backgroundColor: '#1E2330',
    borderRadius: 14,
    padding: 14,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#2D3447',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  systemIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  systemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  systemDesc: {
    fontSize: 11,
    color: '#636E72',
    lineHeight: 15,
    marginBottom: 10,
  },
  systemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  systemCount: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  systemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#74B9FF',
  },
  systemAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
