import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity
} from 'react-native';
import { modelExists, downloadModel, loadModel } from '../engine/modelManager';
import { loadEmbedder } from '../engine/embeddings';
import { ProgressBar } from './ProgressBar';

interface Props {
  onReady: () => void;
}

export const ModelDownloader: React.FC<Props> = ({ onReady }) => {
  const [stage, setStage] = useState<'checking' | 'downloading' | 'loading' | 'embedder' | 'done'>('checking');
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0); // 🔥 triggers re-run
  const [pulse] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setError(null);
        setStage('checking');

        const exists = await modelExists();

        if (!exists) {
          setStage('downloading');

          await downloadModel((pct, dl, tot) => {
            if (!isMounted) return;
            setProgress(pct);
            setDownloaded(dl);
            setTotal(tot);
          });
        }

        setStage('loading');
        await loadModel();

        setStage('embedder');
        await loadEmbedder();

        if (!isMounted) return;

        setStage('done');
        onReady();

      } catch (e: any) {
        console.error('[DOWNLOADER ERROR]:', e);
        if (isMounted) {
          setError(e?.message || 'Unknown error');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [retryKey]); // 🔥 critical

  const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

  const stageText: Record<string, string> = {
    checking: 'Checking local storage...',
    downloading: `Downloading AI model ${formatMB(downloaded)}MB / ${formatMB(total)}MB`,
    loading: 'Loading model into memory...',
    embedder: 'Initializing embedding engine...',
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.logo, { transform: [{ scale: pulse }] }]}>
        ⬡
      </Animated.Text>

      <Text style={styles.title}>RAG Assistant</Text>
      <Text style={styles.subtitle}>Setting up your on-device AI</Text>

      <View style={styles.card}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>Download failed: {error}</Text>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setError(null);
                setRetryKey(prev => prev + 1); // 🔥 re-trigger effect
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.stageText}>{stageText[stage] || ''}</Text>

            {stage === 'downloading' && (
              <>
                <ProgressBar progress={progress} />
                <Text style={styles.pct}>{progress}%</Text>
              </>
            )}

            {(stage === 'loading' || stage === 'embedder' || stage === 'checking') && (
              <ProgressBar />
            )}
          </>
        )}
      </View>

      <Text style={styles.note}>
        This happens only once. No internet needed after.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: { fontSize: 64, color: '#7c6aff', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#ffffff', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 6, marginBottom: 40 },

  card: {
    width: '100%',
    backgroundColor: '#13131a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },

  stageText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center'
  },

  pct: {
    color: '#7c6aff',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600'
  },

  note: {
    color: '#555',
    fontSize: 12,
    marginTop: 32,
    textAlign: 'center'
  },

  // 🔴 Error UI
  errorCard: {
    backgroundColor: '#1a0a0a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff444433',
  },

  errorText: {
    color: '#ff4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center'
  },

  retryBtn: {
    backgroundColor: '#7c6aff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },

  retryText: {
    color: '#fff',
    fontWeight: '600'
  },
});