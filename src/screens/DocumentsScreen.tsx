import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { insertDocument, insertChunk, getAllDocuments, deleteDocument } from '../db/database';
import { chunkText } from '../utils/chunker';
import { generateEmbedding } from '../engine/embeddings';
import { extractPdfText } from '../parsers/pdfParser';
import { extractDocxText } from '../parsers/docxParser';
import { extractTxtText } from '../parsers/txtParser';

const MAX_DOCS = 10;
const MAX_SIZE = 5 * 1024 * 1024;

export const DocumentsScreen = () => {
  const [docs, setDocs] = useState<any[]>(() => getAllDocuments());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');

  const refreshDocs = () => setDocs(getAllDocuments());

  const pickAndProcess = useCallback(async () => {
    if (docs.length >= MAX_DOCS) {
      Alert.alert('Limit reached', 'Maximum 10 documents reached');
      return;
    }

    try {
      const [result] = await pick({
        type: [
          types.pdf,
          types.docx,
          'text/plain',
        ],
        allowMultiSelection: false,
      });

      if ((result.size || 0) > MAX_SIZE) {
        Alert.alert('Too large', 'File exceeds 5MB limit');
        return;
      }

      setProcessing(true);
      setProgress('Reading file...');

      const filePath = result.uri.replace('file://', '');
      const ext = result.name?.split('.').pop()?.toLowerCase();

      let text = '';
      if (ext === 'pdf') text = await extractPdfText(filePath);
      else if (ext === 'docx') text = await extractDocxText(filePath);
      else text = await extractTxtText(filePath);

      if (!text || text.length < 10) throw new Error('Could not extract text from file');

      const chunks = chunkText(text);
      const docId = insertDocument(result.name || 'Unknown', ext || 'txt', result.size || 0);

      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Processing chunk ${i + 1} of ${chunks.length}...`);
        console.log('[DOCS] Generating embedding for chunk', i, ':', chunks[i].slice(0, 50));
        const embedding = await generateEmbedding(chunks[i]);
        console.log('[DOCS] Embedding length:', embedding?.length);
        insertChunk(docId!, chunks[i], embedding);
      }

      refreshDocs();
      Alert.alert('Done', `Processed ${chunks.length} chunks`);
    } catch (e: any) {
      if (!isErrorWithCode(e) || e.code !== errorCodes.OPERATION_CANCELED) {
        Alert.alert('Error', e.message);
      }
    } finally {
      setProcessing(false);
      setProgress('');
    }
  }, [docs]);

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Delete', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { deleteDocument(id); refreshDocs(); },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.counter}>{docs.length}/{MAX_DOCS}</Text>
      </View>

      {processing && (
        <View style={styles.progressCard}>
          <ActivityIndicator color="#7c6aff" />
          <Text style={styles.progressText}>{progress}</Text>
        </View>
      )}

      <FlatList
        data={docs}
        keyExtractor={d => String(d.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubtext}>Upload a PDF, DOCX, or TXT to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.docCard}>
            <View style={styles.docIcon}>
              <Text style={styles.docExt}>{item.type.toUpperCase()}</Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.docSize}>{(item.size / 1024).toFixed(1)} KB</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
              <Text style={styles.deleteIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.uploadBtn, processing && styles.uploadBtnDisabled]}
        onPress={pickAndProcess}
        disabled={processing}>
        <Text style={styles.uploadText}>{processing ? 'Processing...' : '+ Upload Document'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  counter: { color: '#555', fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  progressCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#13131a', margin: 16, padding: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#7c6aff44',
  },
  progressText: { color: '#aaa', fontSize: 13, flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#666', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 6, textAlign: 'center' },
  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#13131a', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e1e2e',
  },
  docIcon: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: '#1e1e2e', alignItems: 'center', justifyContent: 'center',
  },
  docExt: { color: '#7c6aff', fontSize: 10, fontWeight: '700' },
  docInfo: { flex: 1 },
  docName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  docSize: { color: '#555', fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteIcon: { color: '#ff4444', fontSize: 16 },
  uploadBtn: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    backgroundColor: '#7c6aff', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  uploadBtnDisabled: { backgroundColor: '#2a2a3a' },
  uploadText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});