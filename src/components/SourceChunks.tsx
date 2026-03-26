import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  sources: { text: string; score: number }[];
}

export const SourceChunks: React.FC<Props> = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.header}>
        <Text style={styles.label}>📎 {sources.length} sources</Text>
        <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && sources.map((s, i) => (
        <View key={i} style={styles.chip}>
          <View style={styles.scoreBar}>
            <Text style={styles.score}>{(s.score * 100).toFixed(0)}%</Text>
          </View>
          <Text style={styles.text} numberOfLines={3}>{s.text}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8, borderTopWidth: 1,
    borderTopColor: '#1e1e2e', paddingTop: 8,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  label: { color: '#555', fontSize: 12, fontWeight: '600' },
  toggle: { color: '#555', fontSize: 10 },
  chip: {
    flexDirection: 'row', gap: 8, marginBottom: 6,
    backgroundColor: '#0d0d14', borderRadius: 8,
    padding: 8, borderWidth: 1, borderColor: '#1e1e2e',
  },
  scoreBar: {
    backgroundColor: '#7c6aff22', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start',
  },
  score: { color: '#7c6aff', fontSize: 10, fontWeight: '700' },
  text: { color: '#666', fontSize: 11, flex: 1, lineHeight: 16 },
});