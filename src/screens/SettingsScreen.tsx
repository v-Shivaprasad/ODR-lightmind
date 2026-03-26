import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getStats, clearAllData } from '../db/database';

export const SettingsScreen = () => {
  const stats = getStats();

  const handleClear = () => {
    Alert.alert('Clear All Data', 'This will delete all documents, chunks, and chat history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: () => { clearAllData(); Alert.alert('Done', 'All data cleared'); },
      },
    ]);
  };

  const rows = [
    { label: 'Model', value: 'Qwen RAG 0.5B Q4_K_M' },
    { label: 'Model Size', value: '~400 MB' },
    { label: 'Embedding Model', value: 'MiniLM-L6-v2' },
    { label: 'Context Window', value: '2048 tokens' },
    { label: 'Max Answer Tokens', value: '150' },
    { label: 'Top-K Chunks', value: '3' },
    { label: 'Documents', value: String(stats.docs) },
    { label: 'Chunks Stored', value: String(stats.chunks) },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        {rows.map((row, i) => (
          <View key={i} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.dangerBtn} onPress={handleClear}>
        <Text style={styles.dangerText}>🗑 Clear All Data</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 24 },
  card: {
    backgroundColor: '#13131a', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e2e', overflow: 'hidden',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#1e1e2e' },
  label: { color: '#888', fontSize: 14 },
  value: { color: '#fff', fontSize: 14, fontWeight: '500' },
  dangerBtn: {
    marginTop: 32, backgroundColor: '#1a0a0a', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ff444433',
  },
  dangerText: { color: '#ff4444', fontSize: 15, fontWeight: '600' },
});