import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { runRAG } from '../engine/inference';
import { saveMessage, getMessages, getAllDocuments } from '../db/database';
import { isModelLoaded } from '../engine/modelManager';
import { MessageBubble } from '../components/MessageBubble';
import { SourceChunks } from '../components/SourceChunks';
import { Alert } from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { text: string; score: number }[];
}

export const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [thinking, setThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const saved = getMessages();
    setMessages(saved.map((m: any) => ({
      id: String(m.id),
      role: m.role,
      content: m.content,
      sources: m.sources ? JSON.parse(m.sources) : undefined,
    })));
  }, []);

  const send = useCallback(async () => {
    if (!input.trim() || generating) return;

    if (!isModelLoaded()) {
      Alert.alert('Model loading, please wait');
      return;
    }

    const docs = getAllDocuments();
    if (docs.length === 0) {
      Alert.alert('Please upload a document first');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    saveMessage('user', userMsg.content);
    setInput('');
    setThinking(true);
    setGenerating(true);

    const assistantId = (Date.now() + 1).toString();
    let fullText = '';
    let msgSources: { text: string; score: number }[] = [];

    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources: [],
    }]);

    try {
      await runRAG(
        userMsg.content,
        (token) => {
          setThinking(false);
          fullText += token;
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
          );
        },
        (sources) => {
          msgSources = sources;
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, sources } : m)
          );
        }
      );
      saveMessage('assistant', fullText, JSON.stringify(msgSources));
    } catch (e: any) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: `Error: ${e.message}` }
          : m
        )
      );
    } finally {
      setGenerating(false);
      setThinking(false);
    }
  }, [input, generating]);

  const renderItem = ({ item }: { item: Message }) => (
    <View>
      <MessageBubble role={item.role} content={item.content} />
      {item.role === 'assistant' && item.sources && item.sources.length > 0 && (
        <View style={styles.sourcesWrapper}>
          <SourceChunks sources={item.sources} />
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>

      {messages.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>Ask anything about your documents</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {thinking && (
        <View style={styles.thinkingRow}>
          <ActivityIndicator size="small" color="#7c6aff" />
          <Text style={styles.thinkingText}>Thinking...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your documents..."
          placeholderTextColor="#555"
          multiline
          editable={!generating}
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[styles.sendBtn, generating && styles.sendBtnDisabled]}
          onPress={send}
          disabled={generating}>
          {generating
            ? <ActivityIndicator size="small" color="#7c6aff" />
            : <Text style={styles.sendIcon}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  list: { padding: 16, paddingBottom: 8 },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#444', fontSize: 15 },
  sourcesWrapper: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
  },
  thinkingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  thinkingText: { color: '#666', fontSize: 13, fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: '#1e1e2e',
    backgroundColor: '#0a0a0f',
  },
  input: {
    flex: 1, backgroundColor: '#13131a', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#fff', fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: '#1e1e2e',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#7c6aff', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2a2a3a' },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
});