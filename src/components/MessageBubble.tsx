import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export const MessageBubble: React.FC<Props> = ({ role, content }) => (
  <View style={[styles.bubble, role === 'user' ? styles.user : styles.ai]}>
    <Text style={[styles.text, role === 'user' ? styles.userText : styles.aiText]}>
      {content || <Text style={styles.thinking}>Thinking...</Text>}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%', marginVertical: 6,
    borderRadius: 16, padding: 14,
  },
  user: { alignSelf: 'flex-end', backgroundColor: '#7c6aff' },
  ai: {
    alignSelf: 'flex-start', backgroundColor: '#13131a',
    borderWidth: 1, borderColor: '#1e1e2e',
  },
  text: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#ddd' },
  thinking: { color: '#666', fontStyle: 'italic' },
});