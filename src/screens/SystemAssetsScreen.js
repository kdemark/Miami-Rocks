import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAssetsBySystem, getSystemById, getSystemStats } from '../data/hotelAssets';
import { formatCurrency, getReplacementPriority } from '../utils/aiEngine';
import AssetCard from '../components/AssetCard';

const SORT_OPTIONS = ['Name', 'Value', 'Priority', 'Condition'];

export default function SystemAssetsScreen({ route, navigation }) {
  const { systemId, systemName } = route.params;
  const insets = useSafeAreaInsets();
  const system = getSystemById(systemId);
  const stats = getSystemStats(systemId);
  const allAssets = getAssetsBySystem(systemId);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('Name');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'compact'

  const filtered = useMemo(() => {
    let result = allAssets.filter(
      (a) =>
        a.assetType.toLowerCase().includes(search.toLowerCase()) ||
        a.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
        a.serialNumber.toLowerCase().includes(search.toLowerCase())
    );
    switch (sortBy) {
      case 'Value':
        result = [...result].sort((a, b) => b.aiReplacementValue - a.aiReplacementValue);
        break;
      case 'Priority':
        result = [...result].sort(
          (a, b) => getReplacementPriority(b).score - getReplacementPriority(a).score
        );
        break;
      case 'Condition': {
        const order = { Poor: 0, Fair: 1, Good: 2, Excellent: 3 };
        result = [...result].sort((a, b) => order[a.condition] - order[b.condition]);
        break;
      }
      default:
        result = [...result].sort((a, b) => a.assetType.localeCompare(b.assetType));
    }
    return result;
  }, [allAssets, search, sortBy]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.systemDot, { backgroundColor: system?.color }]} />
          <Text style={styles.headerTitle}>{systemName}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(viewMode === 'card' ? 'compact' : 'card')}
        >
          <Ionicons
            name={viewMode === 'card' ? 'list-outline' : 'grid-outline'}
            size={20}
            color="#74B9FF"
          />
        </TouchableOpacity>
      </View>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <StatPill label="Assets" value={String(stats.count)} />
        <StatPill label="Total Value" value={formatCurrency(stats.totalValue)} />
        <StatPill label="Contracts/yr" value={formatCurrency(stats.totalContractCost)} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#636E72" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search assets..."
          placeholderTextColor="#636E72"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#636E72" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Options */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.sortChip, sortBy === opt && styles.sortChipActive]}
            onPress={() => setSortBy(opt)}
          >
            <Text style={[styles.sortChipText, sortBy === opt && styles.sortChipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Asset List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AssetCard
            asset={item}
            compact={viewMode === 'compact'}
            onPress={() => navigation.navigate('AssetDetail', { assetId: item.id })}
          />
        )}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color="#2D3447" />
            <Text style={styles.emptyText}>No assets match your search</Text>
          </View>
        }
      />
    </View>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  systemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewToggle: {
    padding: 8,
    backgroundColor: '#1E2330',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D3447',
  },
  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#1E2330',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3447',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#74B9FF',
  },
  statLabel: {
    fontSize: 10,
    color: '#636E72',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2330',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2D3447',
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  sortLabel: {
    fontSize: 12,
    color: '#636E72',
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D3447',
    backgroundColor: '#1E2330',
  },
  sortChipActive: {
    backgroundColor: '#74B9FF22',
    borderColor: '#74B9FF',
  },
  sortChipText: {
    fontSize: 12,
    color: '#636E72',
  },
  sortChipTextActive: {
    color: '#74B9FF',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    color: '#636E72',
    fontSize: 14,
  },
});
